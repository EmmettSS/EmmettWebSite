/**
 * G7 — no dead code, no placeholder copy. These checks are static on purpose:
 * a name that no longer exists cannot be exercised by a runtime test.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = path.resolve(__dirname, "..");
const self = path.join(src, "lib", "dead-code.test.ts");

function filesUnder(dir: string, pattern = /\.(ts|tsx|css)$/): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return filesUnder(full, pattern);
    return pattern.test(full) && full !== self ? [full] : [];
  });
}

describe("G7 — dead code and placeholder copy", () => {
  it("the removed 3D scene is gone from the source tree", () => {
    const offenders = filesUnder(src).filter(
      (file) =>
        /NeuralNetwork3D/.test(readFileSync(file, "utf8")) &&
        // The only allowed mention is the changelog note in HeroSystem's header comment.
        !file.endsWith(path.join("scenes", "HeroSystem", "index.tsx")),
    );
    expect(offenders).toEqual([]);
  });

  it("no lorem ipsum and no [SAMPLE] placeholder survives in shipped copy", () => {
    const offenders = filesUnder(src).filter((file) => {
      const text = readFileSync(file, "utf8");
      return /lorem ipsum/i.test(text) || /\[SAMPLE/.test(text);
    });
    expect(offenders).toEqual([]);
  });

  it("every [INPUT …] marker in user-visible content carries a B-id", () => {
    // Code may test for the marker prefix; only shipped copy must be well formed.
    const offenders = filesUnder(path.join(src, "content")).filter((file) =>
      /\[INPUT(?!\s+B\d+)/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
