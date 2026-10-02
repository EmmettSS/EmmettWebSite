import { describe, expect, it } from "vitest";

import {
  MAX_SEQUENCE_LENGTH,
  analyze,
  codonUsage,
  complement,
  composition,
  findOrfs,
  formatFasta,
  gcPercent,
  gcRichRegions,
  gcTrack,
  gcWindows,
  meltingTemperature,
  molecularWeightDa,
  parseFasta,
  reverseComplement,
  sanitizeInput,
  transcribe,
  translate,
} from "@/features/biolab/logic";
import { REFERENCE_SAMPLE, TINY_EXAMPLE } from "@/features/biolab/data/reference";

describe("F-09 · input sanitisation and FASTA parsing", () => {
  it("strips FASTA headers, whitespace and line numbering, and reports illegal glyphs", () => {
    const good = sanitizeInput(">seq1 test record\n1 ATG CGT\n002\tACg\n");
    expect(good.sequence).toBe("ATGCGTACG");
    expect(good.header).toBe("seq1 test record");
    expect(good.error).toBeNull();

    const bad = sanitizeInput("ATGCXYZT");
    expect(bad.error).not.toBeNull();
    expect(bad.error?.fa).toContain("X");
    expect(bad.sequence).toBe("ATGCT");

    const empty = sanitizeInput("   \n\n");
    expect(empty.error?.en).toMatch(/no sequence/i);
  });

  it("refuses sequences longer than the documented ceiling", () => {
    const huge = "A".repeat(MAX_SEQUENCE_LENGTH + 1);
    const result = sanitizeInput(huge);
    expect(result.error?.en).toMatch(/too long/i);
    expect(result.length).toBe(MAX_SEQUENCE_LENGTH + 1);
  });

  it("parses multi-record FASTA through the same path as the reference sample", () => {
    const records = parseFasta(">a\nATGC\n>b second\nGGTT\n");
    expect(records).toHaveLength(2);
    expect(records[1].header).toBe("b second");
    expect(records[1].sequence).toBe("GGTT");
    expect(parseFasta(REFERENCE_SAMPLE.fasta)[0].sequence.length).toBe(REFERENCE_SAMPLE.expectedLength);
  });
});

describe("F-09 · composition and thermodynamics", () => {
  it("computes base counts, GC percent and GC skew", () => {
    const comp = composition("GGGCCCAAATTT");
    expect(comp.counts).toEqual({ A: 3, C: 3, G: 3, T: 3, N: 0 });
    expect(comp.gcPercent).toBeCloseTo(50, 5);
    expect(comp.gcSkew).toBeCloseTo(0, 10);
    expect(gcPercent("AAAA")).toBe(0);
  });

  it("estimates molecular weight and melting temperature with a stated method", () => {
    expect(molecularWeightDa("")).toBe(0);
    expect(molecularWeightDa("ATGC")).toBeGreaterThan(1100);
    expect(molecularWeightDa("ATGC")).toBeLessThan(1400);

    const short = meltingTemperature("ATGCATGCATGC");
    expect(short.method).toBe("wallace");
    expect(short.wallace).toBe(2 * 6 + 4 * 6);

    const long = meltingTemperature("ATGCATGCATGCATGCATGCATGCATGCATGC");
    expect(long.method).toBe("gc-formula");
    expect(Number.isFinite(long.gcFormula)).toBe(true);
  });
});

describe("F-09 · strand operations and translation", () => {
  it("complements, reverse-complements and transcribes DNA", () => {
    expect(complement("ATCGN")).toBe("TAGCN");
    expect(reverseComplement("ATGC")).toBe("GCAT");
    expect(reverseComplement(reverseComplement("ATGCGTACGTTAGCTAGCTA"))).toBe("ATGCGTACGTTAGCTAGCTA");
    expect(transcribe("ATGCTT")).toBe("AUGCUU");
  });

  it("translates in all three frames with the selected genetic code", () => {
    // Expected strings were derived independently with a codon table built in TCAG order.
    expect(translate(TINY_EXAMPLE)).toBe("MRTLAS*HRS*LAS*HRSIV");
    expect(translate(TINY_EXAMPLE, { frame: 1 })).toBe("CVR*LASIDRS*LASIDRS*");
    expect(translate(TINY_EXAMPLE, { frame: 2 })).toBe("AYVS*LASIVAS*LASIDR");
    expect(translate("ATGAAATAA")).toBe("MK*"); // the stop codon is kept unless asked otherwise
    expect(translate("ATGAAATAA", { stopAtStop: true })).toBe("MK");
    expect(translate("ATGAGAAGG")).toBe("MRR");
    // Vertebrate mitochondrial code reads AGA/AGG as stops.
    expect(translate("ATGAGAAGG", { table: "vertebrate-mito" })).toBe("M**");
    expect(translate("ATGATTATA", { table: "vertebrate-mito" })).toBe("MIM"); // ATA → Met in vertebrate mitochondria
  });
});

describe("F-09 · ORF discovery", () => {
  it("finds the longest ORF with correct 1-based coordinates and labels partial ones", () => {
    const sequence = "GG" + "ATG" + "AAA".repeat(20) + "TAA" + "CC";
    const orfs = findOrfs(sequence, { minAa: 10, bothStrands: false });
    expect(orfs).toHaveLength(1);
    expect(orfs[0].start).toBe(3);
    expect(orfs[0].end).toBe(68);
    expect(orfs[0].lengthNt).toBe(66); // ATG + 20·AAA + TAA
    expect(orfs[0].lengthAa).toBe(21); // initiator methionine + 20 lysines
    expect(orfs[0].protein).toBe("M" + "K".repeat(20));
    expect(orfs[0].frame).toBe(3); // 0-based index 2 → the third reading frame
    expect(orfs[0].complete).toBe(true);

    const openEnded = findOrfs("ATG" + "AAA".repeat(40), { minAa: 10, bothStrands: false });
    expect(openEnded[0].complete).toBe(false);
    expect(openEnded[0].lengthAa).toBe(41); // initiator plus 40 lysines, no stop available
    expect(openEnded[0].protein).toBe("M" + "K".repeat(40));
  });

  it("honours the minimum length and both-strand switches", () => {
    const shortOrf = "ATG" + "AAA".repeat(5) + "TAA";
    expect(findOrfs(shortOrf, { minAa: 10, bothStrands: false })).toHaveLength(0);
    expect(findOrfs(shortOrf, { minAa: 3, bothStrands: false })).toHaveLength(1);
    expect(findOrfs(shortOrf, { minAa: 3, bothStrands: true }).length).toBeGreaterThanOrEqual(1);
  });

  it("sorts ORFs longest-first and respects the result limit", () => {
    const sequence = "ATG" + "AAA".repeat(30) + "TAA" + "CC".repeat(9) + "ATG" + "CCC".repeat(10) + "TAA";
    const orfs = findOrfs(sequence, { minAa: 5, bothStrands: false, limit: 2 });
    expect(orfs).toHaveLength(2);
    expect(orfs[0].lengthNt).toBeGreaterThan(orfs[1].lengthNt);
  });
});

describe("F-09 · GC map and codon usage", () => {
  it("builds sliding windows, GC-rich regions and a down-sampled track", () => {
    const sequence = "GC".repeat(200);
    const windows = gcWindows(sequence, 50, 10);
    expect(windows.length).toBe(Math.floor((sequence.length - 50) / 10) + 1);
    expect(windows[0].gc).toBeCloseTo(100, 5);

    const regions = gcRichRegions(windows, 60, 3);
    expect(regions).toHaveLength(1);
    expect(regions[0].gc).toBeCloseTo(100, 5);
    expect(gcRichRegions(gcWindows("AT".repeat(200), 50, 10), 60, 3)).toHaveLength(0);

    const track = gcTrack(sequence, 100);
    expect(track.length).toBe(100);
    expect(track.every((value) => value === 100)).toBe(true);
  });

  it("counts codons per thousand and skips ambiguous codons", () => {
    const usage = codonUsage("ATGATGAAATAA");
    const atg = usage.find((row) => row.codon === "ATG");
    expect(atg?.count).toBe(2);
    expect(atg?.perThousand).toBeCloseTo((2 / 4) * 1000, 5);
    expect(codonUsage("ATGNNNTAA")).toHaveLength(2);
  });
});

describe("F-09 · export helpers and the single analysis entry point", () => {
  it("wraps FASTA at the requested width", () => {
    const fasta = formatFasta("A".repeat(130), { width: 60, id: "demo", description: "unit test" });
    const lines = fasta.split("\n");
    expect(lines[0]).toBe(">demo unit test");
    expect(lines[1]).toHaveLength(60);
    expect(lines[3]).toHaveLength(10);
    expect(formatFasta("ACGT").split("\n")[0]).toBe(">sequence");
  });

  it("runs every stage in one call and reports finished stages in order", () => {
    const stages: string[] = [];
    const result = analyze(TINY_EXAMPLE, { minOrfAa: 4, gcWindow: 12, gcStep: 3 }, (stage) => stages.push(stage));
    expect(stages).toEqual(["composition", "thermo", "gc", "orfs", "codons", "done"]);
    expect(result.length).toBe(TINY_EXAMPLE.length);
    expect(result.composition.counts.A + result.composition.counts.N).toBeGreaterThan(0);
    expect(result.reverseComplementPreview.length).toBeGreaterThan(0);
    expect(result.proteinPreview.startsWith("MRTLA")).toBe(true);
    expect(result.computeMs).toBeGreaterThanOrEqual(0);
    expect(result.options.minOrfAa).toBe(4);
  });
});

describe("F-09 · public reference sample (SARS-CoV-2 spike CDS, MN908947.3)", () => {
  const record = parseFasta(REFERENCE_SAMPLE.fasta)[0];

  it("matches the published length, composition and single-ORF structure", () => {
    expect(record.sequence).toHaveLength(3822);
    expect(record.sequence).toHaveLength(REFERENCE_SAMPLE.expectedLength);
    expect(record.sequence.length % 3).toBe(0);
    expect(record.sequence.startsWith("ATG")).toBe(true);
    expect(record.sequence.endsWith("TAA")).toBe(true);
    expect(composition(record.sequence).gcPercent).toBeCloseTo(REFERENCE_SAMPLE.expectedGcPercent, 2);

    const protein = translate(record.sequence);
    expect(protein).toHaveLength(1274); // 1,273 residues plus the stop
    expect(protein.startsWith("MFVFLVLLPLVSSQCVNLTTRTQLPPAYTNSFTRGVYYPD")).toBe(true);
    expect(protein.endsWith("CGSCCKFDEDDSEPVLKGVKLHYT*")).toBe(true);
    expect(protein.slice(0, -1)).not.toContain("*");

    const longest = findOrfs(record.sequence, { minAa: 1000, bothStrands: false })[0];
    expect(longest.start).toBe(1);
    expect(longest.end).toBe(3822);
    expect(longest.lengthAa).toBe(1273);
    expect(longest.protein).toBe(protein.slice(0, -1));
  });

  it("keeps the SARS-CoV-2 landmarks that make it a teaching sample", () => {
    const protein = translate(record.sequence);
    expect(protein.slice(680, 685)).toBe("PRRAR"); // furin cleavage site, residues 681–685
    expect(protein[613]).toBe("D"); // D614
    expect(protein[500]).toBe("N"); // N501
    expect(protein).not.toContain("PRRAR".repeat(2));
  });

  it("produces the same numbers through the full analysis pipeline", () => {
    const result = analyze(record.sequence, { minOrfAa: 200, orfLimit: 10 });
    expect(result.longestOrf?.lengthAa).toBe(1273);
    // The spike CDS is AT-rich (37.3% GC): no window reaches the default 60% threshold.
    expect(result.gcRegions).toHaveLength(0);
    const relaxed = analyze(record.sequence, { minOrfAa: 200, gcRichThreshold: 45 });
    expect(relaxed.gcRegions.length).toBeGreaterThan(0);
    expect(relaxed.gcRegions.every((region) => region.gc >= 45)).toBe(true);
    expect(result.molecularWeightDa).toBeGreaterThan(1_000_000); // ~119 kDa protein, ~2.4 MDa dsDNA
    expect(result.codonUsage.reduce((total, row) => total + row.count, 0)).toBe(1274);
  });
});
