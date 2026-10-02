/** F-14 — the matrix may not claim anything the registry cannot prove. */
import { describe, expect, it } from "vitest";
import { CAPABILITIES, CAPABILITY_LABELS, liveArtifactsFor } from "@/features/registry";
import { buildMatrix, capabilityCoverage } from "./matrix";

describe("F-14 · capability matrix", () => {
  it("gives every capability at least one live artifact with an evidence URL (G1)", () => {
    for (const capability of CAPABILITIES) {
      const artifacts = liveArtifactsFor(capability);
      expect(artifacts.length, `${capability} has no live artifact`).toBeGreaterThan(0);
      for (const artifact of artifacts) {
        expect(artifact.evidenceUrl?.fa).toMatch(/^\/fa\//);
        expect(artifact.evidenceUrl?.en).toMatch(/^\/en\//);
      }
    }
  });

  it("renders one row per capability and no empty row", () => {
    for (const lang of ["fa", "en"] as const) {
      const rows = buildMatrix(lang);
      expect(rows.map((row) => row.capability)).toEqual([...CAPABILITIES]);
      expect(rows.every((row) => row.live)).toBe(true);
      expect(rows.every((row) => row.cells.length === liveArtifactsFor(row.capability).length)).toBe(true);
      expect(rows.map((row) => row.label)).toEqual(CAPABILITIES.map((capability) => CAPABILITY_LABELS[capability][lang]));
    }
  });

  it("prefixes every cell link with the locale and tags it for attribution", () => {
    const cells = buildMatrix("fa").flatMap((row) => row.cells);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.href.startsWith("/fa/")).toBe(true);
      expect(cell.href).toContain("utm_source=capabilities");
    }
  });

  it("coverage counts match the matrix and never invent numbers", () => {
    const coverage = capabilityCoverage();
    expect(coverage).toHaveLength(5);
    for (const entry of coverage) {
      expect(entry.artifacts).toBe(liveArtifactsFor(entry.capability).length);
    }
  });
});
