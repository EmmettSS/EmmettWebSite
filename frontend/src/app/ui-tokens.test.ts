import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const globals = readFileSync(resolve(root, "src/app/globals.css"), "utf8");
const shell = readFileSync(resolve(root, "src/app/ui-theme.css"), "utf8");

describe("UI tokens on :root", () => {
  it("uses the emerald palette as the only theme", () => {
    expect(globals).toContain("--background: #0b1f18;");
    expect(globals).toContain("--primary: #1fae6e;");
    expect(globals).toContain("--radius-value-md: calc(var(--radius) - 2px);");
    expect(globals).not.toMatch(/\.dark\s*\{/);
    expect(globals).not.toContain("--background: #f6f4f0;");
    expect(globals).not.toContain("--background: #0b0c0e;");
  });

  it("does not keep a scoped token override", () => {
    expect(shell).not.toContain(".ui-theme");
    expect(shell).toContain(".font-mono");
  });
});
