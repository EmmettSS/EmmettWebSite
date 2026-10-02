/**
 * Bio workbench core (F-09) — pure, DOM-free logic.
 *
 * Everything here runs in three places with identical results:
 *   1. the Web Worker (`worker.ts`) for large sequences,
 *   2. the chunked main-thread fallback (`runner.ts`) when Workers are unavailable,
 *   3. the Static Bridge build (`scripts/render-public-html.ts`) for crawlable examples.
 *
 * There is no network access, no logging and no clinical claim anywhere in this module.
 */

export type Localized = { fa: string; en: string };

export const MAX_SEQUENCE_LENGTH = 1_000_000;
export const DEFAULT_MIN_ORF_AA = 30;
export const CODON_TABLES = {
  standard: {
    label: { fa: "جدول استاندارد", en: "Standard code" },
    starts: ["ATG", "TTG", "CTG", "GTG"],
    stops: ["TAA", "TAG", "TGA"],
    table: {
      TTT: "F", TTC: "F", TTA: "L", TTG: "L", CTT: "L", CTC: "L", CTA: "L", CTG: "L",
      ATT: "I", ATC: "I", ATA: "I", ATG: "M", GTT: "V", GTC: "V", GTA: "V", GTG: "V",
      TCT: "S", TCC: "S", TCA: "S", TCG: "S", CCT: "P", CCC: "P", CCA: "P", CCG: "P",
      ACT: "T", ACC: "T", ACA: "T", ACG: "T", GCT: "A", GCC: "A", GCA: "A", GCG: "A",
      TAT: "Y", TAC: "Y", TAA: "*", TAG: "*", CAT: "H", CAC: "H", CAA: "Q", CAG: "Q",
      AAT: "N", AAC: "N", AAA: "K", AAG: "K", GAT: "D", GAC: "D", GAA: "E", GAG: "E",
      TGT: "C", TGC: "C", TGA: "*", TGG: "W", CGT: "R", CGC: "R", CGA: "R", CGG: "R",
      AGT: "S", AGC: "S", AGA: "R", AGG: "R", GGT: "G", GGC: "G", GGA: "G", GGG: "G",
    } as Record<string, string>,
  },
  "vertebrate-mito": {
    label: { fa: "میتوکندری مهره‌داران", en: "Vertebrate mitochondrial" },
    starts: ["ATG", "ATT", "ATC", "ATA", "GTG"],
    stops: ["TAA", "TAG", "AGA", "AGG"],
    table: {
      TTT: "F", TTC: "F", TTA: "L", TTG: "L", CTT: "L", CTC: "L", CTA: "L", CTG: "L",
      ATT: "I", ATC: "I", ATA: "M", ATG: "M", GTT: "V", GTC: "V", GTA: "V", GTG: "V",
      TCT: "S", TCC: "S", TCA: "S", TCG: "S", CCT: "P", CCC: "P", CCA: "P", CCG: "P",
      ACT: "T", ACC: "T", ACA: "T", ACG: "T", GCT: "A", GCC: "A", GCA: "A", GCG: "A",
      TAT: "Y", TAC: "Y", TAA: "*", TAG: "*", CAT: "H", CAC: "H", CAA: "Q", CAG: "Q",
      AAT: "N", AAC: "N", AAA: "K", AAG: "K", GAT: "D", GAC: "D", GAA: "E", GAG: "E",
      TGT: "C", TGC: "C", TGA: "W", TGG: "W", CGT: "R", CGC: "R", CGA: "R", CGG: "R",
      AGT: "S", AGC: "S", AGA: "*", AGG: "*", GGT: "G", GGC: "G", GGA: "G", GGG: "G",
    } as Record<string, string>,
  },
  "yeast-mito": {
    label: { fa: "میتوکندری مخمر", en: "Yeast mitochondrial" },
    starts: ["ATG", "ATA"],
    stops: ["TAA", "TAG"],
    table: {
      TTT: "F", TTC: "F", TTA: "L", TTG: "L", CTT: "T", CTC: "T", CTA: "T", CTG: "T",
      ATT: "I", ATC: "I", ATA: "M", ATG: "M", GTT: "V", GTC: "V", GTA: "V", GTG: "V",
      TCT: "S", TCC: "S", TCA: "S", TCG: "S", CCT: "P", CCC: "P", CCA: "P", CCG: "P",
      ACT: "T", ACC: "T", ACA: "T", ACG: "T", GCT: "A", GCC: "A", GCA: "A", GCG: "A",
      TAT: "Y", TAC: "Y", TAA: "*", TAG: "*", CAT: "H", CAC: "H", CAA: "Q", CAG: "Q",
      AAT: "N", AAC: "N", AAA: "K", AAG: "K", GAT: "D", GAC: "D", GAA: "E", GAG: "E",
      TGT: "C", TGC: "C", TGA: "W", TGG: "W", CGT: "R", CGC: "R", CGA: "R", CGG: "R",
      AGT: "S", AGC: "S", AGA: "R", AGG: "R", GGT: "G", GGC: "G", GGA: "G", GGG: "G",
    } as Record<string, string>,
  },
} as const;

export type CodonTableId = keyof typeof CODON_TABLES;

export type SanitizeResult = {
  sequence: string;
  header: string | null;
  /** Characters that are not A/C/G/T/N, with their 1-based position in the raw input. */
  invalid: { char: string; index: number }[];
  /** Human-readable rejection reason, null when the sequence is usable. */
  error: Localized | null;
  length: number;
};

/** FASTA-aware clean-up: headers are stripped, whitespace and digits removed, case folded. */
export function sanitizeInput(raw: string): SanitizeResult {
  const lines = raw.split(/\r?\n/);
  let header: string | null = null;
  const chunks: string[] = [];
  const invalid: { char: string; index: number }[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith(">")) {
      if (header === null) header = trimmed.slice(1).trim();
      continue;
    }
    const cleaned = trimmed.replace(/[\s\d]/g, "");
    for (const char of cleaned.toUpperCase()) {
      if (char === "A" || char === "C" || char === "G" || char === "T" || char === "N") {
        chunks.push(char);
      } else if (invalid.length < 200) {
        invalid.push({ char, index: chunks.length + 1 });
      }
    }
  }
  const sequence = chunks.join("");
  let error: Localized | null = null;
  if (!sequence) {
    error = { fa: "توالی‌ای پیدا نشد. فقط حروف A، C، G، T و N (و سرخط FASTA با >) پذیرفته می‌شود.", en: "No sequence found. Only A, C, G, T, N and a FASTA header (>) are accepted." };
  } else if (invalid.length) {
    error = {
      fa: `کاراکتر غیرمجاز «${invalid[0].char}» در جایگاه ${invalid[0].index}؛ توالی DNA فقط از A، C، G، T و N ساخته می‌شود.`,
      en: `Illegal character “${invalid[0].char}” at position ${invalid[0].index}; DNA sequences only contain A, C, G, T and N.`,
    };
  } else if (sequence.length > MAX_SEQUENCE_LENGTH) {
    error = {
      fa: `توالی بیش از حد بلند است (${sequence.length.toLocaleString("en-US")} بازنوکلئوتید). سقف این نسخه ۱٬۰۰۰٬۰۰۰ باز است.`,
      en: `Sequence is too long (${sequence.length.toLocaleString("en-US")} nt). This build caps at 1,000,000 nt.`,
    };
  }
  return { sequence, header, invalid, error, length: sequence.length };
}

export type FastaRecord = { header: string | null; sequence: string };

/** Splits a multi-record FASTA into records; the demo sample uses the same path. */
export function parseFasta(raw: string): FastaRecord[] {
  const records: FastaRecord[] = [];
  let current: FastaRecord | null = null;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith(">")) {
      current = { header: trimmed.slice(1).trim(), sequence: "" };
      records.push(current);
      continue;
    }
    if (!current) {
      current = { header: null, sequence: "" };
      records.push(current);
    }
    current.sequence += trimmed.replace(/[\s\d]/g, "").toUpperCase();
  }
  return records.filter((record) => record.sequence.length > 0);
}

export type Composition = {
  length: number;
  counts: { A: number; C: number; G: number; T: number; N: number };
  gcPercent: number;
  atPercent: number;
  gcSkew: number;
  ambiguous: number;
};

export function composition(sequence: string): Composition {
  let a = 0, c = 0, g = 0, t = 0, n = 0;
  for (let index = 0; index < sequence.length; index += 1) {
    switch (sequence.charCodeAt(index)) {
      case 65: a += 1; break; // A
      case 67: c += 1; break; // C
      case 71: g += 1; break; // G
      case 84: t += 1; break; // T
      default: n += 1;
    }
  }
  const resolved = a + c + g + t;
  const gc = g + c;
  return {
    length: sequence.length,
    counts: { A: a, C: c, G: g, T: t, N: n },
    gcPercent: resolved ? (gc / resolved) * 100 : 0,
    atPercent: resolved ? ((a + t) / resolved) * 100 : 0,
    gcSkew: g + c ? (g - c) / (g + c) : 0,
    ambiguous: n,
  };
}

export function gcPercent(sequence: string): number {
  return composition(sequence).gcPercent;
}

/** Average single-strand molecular weight (Daltons) from the standard nucleotide masses. */
export function molecularWeightDa(sequence: string): number {
  const { counts } = composition(sequence);
  const mass = counts.A * 313.21 + counts.T * 304.2 + counts.C * 289.18 + counts.G * 329.21;
  return Math.max(0, mass - 61.96);
}

export type MeltingResult = {
  /** Wallace rule — only valid for short oligos (≤ 14 nt). */
  wallace: number;
  /** GC-based estimate for longer duplexes, salt-adjusted (SantaLucia-style correction). */
  gcFormula: number;
  saltMolar: number;
  method: "wallace" | "gc-formula";
};

/**
 * Melting temperature estimate. Short oligos use the Wallace rule; longer ones the
 * GC-based formula with a salt correction (Tm += 16.6·log10[Na+]). It is an estimate:
 * accurate nearest-neighbour Tm needs the full thermodynamic table, which we do not ship.
 */
export function meltingTemperature(sequence: string, saltMolar = 0.05): MeltingResult {
  const { counts } = composition(sequence);
  const length = sequence.length;
  const wallace = 2 * (counts.A + counts.T) + 4 * (counts.G + counts.C);
  const saltCorrection = 16.6 * Math.log10(Math.max(saltMolar, 1e-6));
  const gcFormula = length
    ? 64.9 + (41 * (counts.G + counts.C - 16.4)) / length + saltCorrection
    : 0;
  return {
    wallace,
    gcFormula,
    saltMolar,
    method: length <= 14 ? "wallace" : "gc-formula",
  };
}

const COMPLEMENT: Record<string, string> = { A: "T", C: "G", G: "C", T: "A", N: "N" };

export function complement(sequence: string): string {
  let out = "";
  for (let index = 0; index < sequence.length; index += 1) {
    out += COMPLEMENT[sequence[index]] ?? "N";
  }
  return out;
}

export function reverseComplement(sequence: string): string {
  let out = "";
  for (let index = sequence.length - 1; index >= 0; index -= 1) {
    out += COMPLEMENT[sequence[index]] ?? "N";
  }
  return out;
}

/** DNA → RNA (T becomes U). The rest of the letters are untouched. */
export function transcribe(sequence: string): string {
  return sequence.replace(/T/g, "U");
}

export type TranslateOptions = { table?: CodonTableId; frame?: 0 | 1 | 2; stopAtStop?: boolean };

export function translate(sequence: string, options: TranslateOptions = {}): string {
  const table = CODON_TABLES[options.table ?? "standard"].table;
  const frame = options.frame ?? 0;
  let protein = "";
  for (let index = frame; index + 2 < sequence.length; index += 3) {
    const codon = sequence.slice(index, index + 3).toUpperCase();
    const amino = table[codon] ?? "X";
    if (amino === "*") {
      if (options.stopAtStop) break;
      protein += "*";
      continue;
    }
    protein += amino;
  }
  return protein;
}

export type Orf = {
  /** 1-based inclusive coordinates on the forward strand of the submitted sequence. */
  start: number;
  end: number;
  frame: 1 | 2 | 3;
  strand: "forward" | "reverse";
  lengthNt: number;
  lengthAa: number;
  protein: string;
  /** False when the ORF runs off the end of the submitted sequence (no stop codon). */
  complete: boolean;
};

function orfFromRun(
  source: string,
  runStart: number,
  runEnd: number,
  frame: number,
  strand: "forward" | "reverse",
  sequenceLength: number,
  tableId: CodonTableId,
  complete: boolean,
): Orf {
  const lengthNt = runEnd - runStart;
  const protein = translate(source.slice(runStart, runEnd), { table: tableId });
  const start = strand === "forward" ? runStart + 1 : sequenceLength - runEnd + 1;
  const end = strand === "forward" ? runEnd : sequenceLength - runStart;
  return {
    start,
    end,
    frame: (frame + 1) as 1 | 2 | 3,
    strand,
    lengthNt,
    lengthAa: complete ? lengthNt / 3 - 1 : Math.floor(lengthNt / 3),
    protein: complete ? protein.slice(0, -1) : protein,
    complete,
  };
}

/** Scans a single reading frame of one strand; the run loop yields between frames. */
export function scanFrame(
  source: string,
  frame: number,
  strand: "forward" | "reverse",
  sequenceLength: number,
  minAa: number,
  tableId: CodonTableId,
): Orf[] {
  const codonTable = CODON_TABLES[tableId].table;
  const starts = CODON_TABLES[tableId].starts;
  const orfs: Orf[] = [];
  let runStart = -1;
  for (let index = frame; index + 2 < source.length; index += 3) {
    const codon = source.slice(index, index + 3);
    if (runStart < 0) {
      if (starts.includes(codon as never)) runStart = index;
      continue;
    }
    if ((codonTable[codon] ?? "X") === "*") {
      const lengthAa = (index + 3 - runStart) / 3 - 1;
      if (lengthAa >= minAa) {
        orfs.push(orfFromRun(source, runStart, index + 3, frame, strand, sequenceLength, tableId, true));
      }
      runStart = -1;
    }
  }
  if (runStart >= 0) {
    const lengthAa = Math.floor((source.length - runStart) / 3);
    if (lengthAa >= minAa) {
      orfs.push(orfFromRun(source, runStart, runStart + lengthAa * 3, frame, strand, sequenceLength, tableId, false));
    }
  }
  return orfs;
}

function scanStrand(
  source: string,
  strand: "forward" | "reverse",
  sequenceLength: number,
  minAa: number,
  tableId: CodonTableId,
): Orf[] {
  const orfs: Orf[] = [];
  for (let frame = 0; frame < 3; frame += 1) {
    orfs.push(...scanFrame(source, frame, strand, sequenceLength, minAa, tableId));
  }
  return orfs;
}

export type OrfOptions = {
  minAa?: number;
  bothStrands?: boolean;
  table?: CodonTableId;
  limit?: number;
};

/** Finds start→stop open reading frames in all three frames, optionally on both strands. */
export function findOrfs(sequence: string, options: OrfOptions = {}): Orf[] {
  const minAa = options.minAa ?? DEFAULT_MIN_ORF_AA;
  const tableId = options.table ?? "standard";
  const orfs = scanStrand(sequence, "forward", sequence.length, minAa, tableId);
  if (options.bothStrands ?? true) {
    orfs.push(...scanStrand(reverseComplement(sequence), "reverse", sequence.length, minAa, tableId));
  }
  orfs.sort((a, b) => b.lengthNt - a.lengthNt || a.start - b.start);
  return options.limit ? orfs.slice(0, options.limit) : orfs;
}

/** The three frames of one strand, used by the generator-based run. */
function scanAllFramesChunked(
  source: string,
  strand: "forward" | "reverse",
  resolved: ResolvedAnalysisOptions,
): Orf[] {
  const orfs: Orf[] = [];
  for (let frame = 0; frame < 3; frame += 1) {
    orfs.push(...scanFrame(source, frame, strand, source.length, resolved.minOrfAa, resolved.table));
  }
  return orfs;
}

export type CodonUsageRow = { codon: string; amino: string; count: number; perThousand: number };

/** Counts codons for a slice of codon indices; the analysis run calls this chunk by chunk. */
export function countCodons(sequence: string, frame: 0 | 1 | 2, from: number, to: number, counts = new Map<string, number>()): Map<string, number> {
  for (let index = from; index < to; index += 1) {
    const position = frame + index * 3;
    if (position + 2 >= sequence.length) break;
    const codon = sequence.slice(position, position + 3);
    if (codon.includes("N")) continue;
    counts.set(codon, (counts.get(codon) ?? 0) + 1);
  }
  return counts;
}

export function codonCountTotal(counts: Map<string, number>): number {
  let total = 0;
  for (const value of counts.values()) total += value;
  return total;
}

export function codonUsageFromCounts(counts: Map<string, number>, tableId: CodonTableId): CodonUsageRow[] {
  const table = CODON_TABLES[tableId].table;
  const total = codonCountTotal(counts);
  return [...counts.entries()]
    .map(([codon, count]) => ({ codon, amino: table[codon] ?? "X", count, perThousand: total ? (count / total) * 1000 : 0 }))
    .sort((a, b) => b.count - a.count || a.codon.localeCompare(b.codon));
}

export function codonUsage(sequence: string, frame: 0 | 1 | 2 = 0, tableId: CodonTableId = "standard"): CodonUsageRow[] {
  const codons = Math.floor(sequence.length / 3);
  return codonUsageFromCounts(countCodons(sequence, frame, 0, codons), tableId);
}

export type GcWindow = { start: number; end: number; gc: number };

export function gcWindowCount(sequenceLength: number, window: number, step: number): number {
  if (sequenceLength < window || step <= 0) return 0;
  return Math.floor((sequenceLength - window) / step) + 1;
}

/** Computes a slice of the sliding-window GC track; the run loop calls it chunk by chunk. */
export function gcWindowRange(sequence: string, window: number, step: number, from: number, to: number): GcWindow[] {
  const windows: GcWindow[] = [];
  const total = gcWindowCount(sequence.length, window, step);
  for (let index = Math.max(0, from); index < Math.min(to, total); index += 1) {
    const start = index * step;
    let gc = 0;
    for (let position = start; position < start + window; position += 1) {
      const code = sequence.charCodeAt(position);
      if (code === 71 || code === 67) gc += 1;
    }
    windows.push({ start, end: start + window, gc: (gc / window) * 100 });
  }
  return windows;
}

/** Sliding-window GC track; the viewer draws this and the table mode lists it. */
export function gcWindows(sequence: string, window = 50, step = 10): GcWindow[] {
  return gcWindowRange(sequence, window, step, 0, gcWindowCount(sequence.length, window, step));
}

export function gcRichRegions(windows: GcWindow[], threshold = 60, minWindows = 3): GcWindow[] {
  const regions: GcWindow[] = [];
  let start: number | null = null;
  let end = 0;
  let sum = 0;
  let count = 0;
  const flush = () => {
    if (start !== null && count >= minWindows) regions.push({ start, end, gc: sum / count });
    start = null;
    sum = 0;
    count = 0;
  };
  for (const window of windows) {
    if (window.gc >= threshold) {
      if (start === null) start = window.start;
      end = window.end;
      sum += window.gc;
      count += 1;
    } else {
      flush();
    }
  }
  flush();
  return regions;
}

/** Down-samples the GC track so the canvas viewer can draw thousands of points cheaply. */
export function gcTrack(sequence: string, buckets = 480): number[] {
  if (!sequence.length) return [];
  const size = Math.max(1, Math.floor(sequence.length / buckets));
  const track: number[] = [];
  for (let start = 0; start < sequence.length; start += size) {
    const end = Math.min(start + size, sequence.length);
    let gc = 0;
    for (let index = start; index < end; index += 1) {
      const code = sequence.charCodeAt(index);
      if (code === 71 || code === 67) gc += 1;
    }
    track.push(end > start ? (gc / (end - start)) * 100 : 0);
  }
  return track;
}

export type FastaFormatOptions = { width?: number; id?: string; description?: string };

export function formatFasta(sequence: string, options: FastaFormatOptions = {}): string {
  const width = options.width && options.width > 0 ? Math.min(options.width, 120) : 60;
  const header = `>${options.id ?? "sequence"}${options.description ? ` ${options.description}` : ""}`;
  const lines: string[] = [];
  for (let index = 0; index < sequence.length; index += width) {
    lines.push(sequence.slice(index, index + width));
  }
  return [header, ...lines].join("\n");
}

export type AnalysisOptions = {
  table?: CodonTableId;
  minOrfAa?: number;
  bothStrands?: boolean;
  gcWindow?: number;
  gcStep?: number;
  gcRichThreshold?: number;
  buckets?: number;
  orfLimit?: number;
  saltMolar?: number;
};

export type AnalysisResult = {
  length: number;
  composition: Composition;
  molecularWeightDa: number;
  tm: MeltingResult;
  orfs: Orf[];
  codonUsage: CodonUsageRow[];
  gcRegions: GcWindow[];
  gcTrack: number[];
  reverseComplementPreview: string;
  proteinPreview: string;
  longestOrf: Orf | null;
  options: Required<Pick<AnalysisOptions, "minOrfAa" | "bothStrands" | "gcWindow" | "gcStep" | "gcRichThreshold" | "buckets" | "orfLimit" | "table" | "saltMolar">>;
  /** Milliseconds spent in the pure computation (evidence for the INP budget). */
  computeMs: number;
};

/** Resolved options after defaults are applied — also used by the chunked runner. */
export function resolveAnalysisOptions(options: AnalysisOptions = {}) {
  return {
    minOrfAa: options.minOrfAa ?? DEFAULT_MIN_ORF_AA,
    bothStrands: options.bothStrands ?? true,
    gcWindow: options.gcWindow ?? 50,
    gcStep: options.gcStep ?? 10,
    gcRichThreshold: options.gcRichThreshold ?? 60,
    buckets: options.buckets ?? 480,
    orfLimit: options.orfLimit ?? 40,
    table: options.table ?? ("standard" as CodonTableId),
    saltMolar: options.saltMolar ?? 0.05,
  };
}

export type ResolvedAnalysisOptions = ReturnType<typeof resolveAnalysisOptions>;

/** One labelled stage. `work` is a generator so the runner can yield between chunks. */
export type AnalysisStep = { stage: AnalysisStage; work: () => Generator<void, void, void> };

/** Chunk sizes: each iteration stays well below one animation frame on a 1 MB sequence. */
export const GC_WINDOWS_PER_CHUNK = 2_000;
export const CODONS_PER_CHUNK = 50_000;

/**
 * One analysis run, split into labelled stages whose heavy loops yield.
 * The worker drains the generators back-to-back; the chunked fallback awaits between
 * yields so a 1 MB sequence never freezes the UI (INP budget, §5.4).
 */
export function createAnalysisRun(sequence: string, options: AnalysisOptions = {}) {
  const resolved = resolveAnalysisOptions(options);
  const parts: Partial<AnalysisResult> = {};
  const started = performanceNow();

  const steps: AnalysisStep[] = [
    {
      stage: "composition",
      work: function* work() {
        parts.composition = composition(sequence);
        yield;
        parts.molecularWeightDa = molecularWeightDa(sequence);
      },
    },
    {
      stage: "thermo",
      work: function* work() {
        parts.tm = meltingTemperature(sequence, resolved.saltMolar);
        yield;
      },
    },
    {
      stage: "gc",
      work: function* work() {
        const total = gcWindowCount(sequence.length, resolved.gcWindow, resolved.gcStep);
        const windows: GcWindow[] = [];
        for (let from = 0; from < total; from += GC_WINDOWS_PER_CHUNK) {
          windows.push(...gcWindowRange(sequence, resolved.gcWindow, resolved.gcStep, from, from + GC_WINDOWS_PER_CHUNK));
          yield;
        }
        parts.gcRegions = gcRichRegions(windows, resolved.gcRichThreshold);
        yield;
        parts.gcTrack = gcTrack(sequence, resolved.buckets);
      },
    },
    {
      stage: "orfs",
      work: function* work() {
        const found: Orf[] = [];
        found.push(...scanAllFramesChunked(sequence, "forward", resolved));
        yield;
        if (resolved.bothStrands) {
          const reverse = reverseComplement(sequence);
          yield;
          found.push(...scanAllFramesChunked(reverse, "reverse", resolved));
        }
        found.sort((a, b) => b.lengthNt - a.lengthNt || a.start - b.start);
        parts.orfs = resolved.orfLimit ? found.slice(0, resolved.orfLimit) : found;
        parts.longestOrf = parts.orfs[0] ?? null;
      },
    },
    {
      stage: "codons",
      work: function* work() {
        const codons = Math.floor(sequence.length / 3);
        const counts = new Map<string, number>();
        for (let from = 0; from < codons; from += CODONS_PER_CHUNK) {
          countCodons(sequence, 0, from, Math.min(from + CODONS_PER_CHUNK, codons), counts);
          yield;
        }
        parts.codonUsage = codonUsageFromCounts(counts, resolved.table);
        parts.reverseComplementPreview = reverseComplement(sequence.slice(0, 120));
        parts.proteinPreview = translate(sequence.slice(0, 120), { table: resolved.table });
      },
    },
  ];

  return {
    sequence,
    resolved,
    steps,
    finish: (): AnalysisResult =>
      ({
        length: sequence.length,
        options: resolved,
        computeMs: Math.round((performanceNow() - started) * 100) / 100,
        ...parts,
      }) as AnalysisResult,
  };
}

export type AnalysisRun = ReturnType<typeof createAnalysisRun>;

/** Drains the stages synchronously — used by the worker and the Static Bridge. */
export function analyze(
  sequence: string,
  options: AnalysisOptions = {},
  onStage?: (stage: AnalysisStage) => void,
): AnalysisResult {
  const run = createAnalysisRun(sequence, options);
  for (const step of run.steps) {
    onStage?.(step.stage);
    for (const _ of step.work()) {
      /* drained synchronously */
    }
  }
  onStage?.("done");
  return run.finish();
}

export type AnalysisStage = "composition" | "thermo" | "gc" | "orfs" | "codons" | "done";

export const ANALYSIS_STAGES: AnalysisStage[] = ["composition", "thermo", "gc", "orfs", "codons", "done"];

export const STAGE_LABEL: Record<AnalysisStage, Localized> = {
  composition: { fa: "ترکیب بازها", en: "Base composition" },
  thermo: { fa: "وزن مولکولی و Tm", en: "Molecular weight and Tm" },
  gc: { fa: "نقشهٔ GC", en: "GC map" },
  orfs: { fa: "یافتن ORF", en: "Open reading frames" },
  codons: { fa: "فراوانی کدون", en: "Codon usage" },
  done: { fa: "پایان", en: "Done" },
};

function performanceNow(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

/** Real spelling-out of the algorithm shown in the “how it works” section (G1). */
export const LOGIC_CODE_SAMPLE = `export function reverseComplement(sequence: string): string {
  let out = "";
  for (let i = sequence.length - 1; i >= 0; i -= 1) {
    out += COMPLEMENT[sequence[i]] ?? "N";   // A<->T, C<->G, N->N
  }
  return out;
}

export function findOrfs(sequence: string, minAa = 30): Orf[] {
  const orfs: Orf[] = [];
  for (let frame = 0; frame < 3; frame += 1) {
    let start: number | null = null;
    for (let i = frame; i + 2 < sequence.length; i += 3) {
      const codon = sequence.slice(i, i + 3);
      if (start === null && codon === "ATG") start = i;
      else if (start !== null && STOP.has(codon)) {
        if ((i - start) / 3 >= minAa) orfs.push({ start: start + 1, end: i + 3, frame, lengthAa: (i - start) / 3 });
        start = null;
      }
    }
  }
  return orfs;                                // O(n) per frame, no regex backtracking
}`;

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) => row.map((cell) => (typeof cell === "number" ? String(cell) : `"${String(cell).replace(/"/g, '""')}"`)).join(","))
    .join("\n");
}
