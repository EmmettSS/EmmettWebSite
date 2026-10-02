import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { executeCommand, type CommandContext } from "@/features/shell/terminal/commands";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

function context() {
  return {
    lang: "fa" as const,
    navigate: vi.fn(),
    setLowPower: vi.fn(),
    switchLanguage: vi.fn(),
    clear: vi.fn(),
    api: { get: vi.fn(async () => ({})) as CommandContext["api"]["get"], post: vi.fn(async () => ({})) as CommandContext["api"]["post"] },
  };
}

afterEach(() => vi.unstubAllGlobals());

/**
 * The four mandatory Phase 2 security tests (exit gate §10). Behavioural where possible,
 * source-level only where behaviour cannot reach the property (e.g. "never logs a token").
 */
describe("F-07 — unknown input is never executed", () => {
  it('answers «دستور ناشناخته» to eval("alert(1)") without calling eval', async () => {
    const spy = vi.fn(() => {
      throw new Error("eval must never run");
    });
    vi.stubGlobal("eval", spy);
    const response = await executeCommand('eval("alert(1)")', context());
    expect(spy).not.toHaveBeenCalled();
    expect(response.kind).toBe("error");
    if (response.kind === "error") {
      expect(response.text).toContain("ناشناخته");
      expect(response.blocked).toBe(true);
    }
  });

  it("blocks javascript:, fs import tricks and function constructors", async () => {
    for (const line of ["javascript:alert(1)", "new Function('return 1')()", "import('/etc/passwd')", "constructor.constructor('return 1')()"]) {
      const response = await executeCommand(line, context());
      expect(response.kind).toBe("error");
    }
  });

  it("never contains eval/Function invocation in the terminal source", () => {
    const source = read("../shell/terminal/commands.ts");
    expect(source).not.toMatch(/new Function\s*\(/);
    expect(source).not.toMatch(/window\s*\[\s*["']eval["']\s*\]/);
    expect(source).not.toMatch(/document\.write\s*\(/);
  });

  it("keeps local commands working even when the API is unreachable", async () => {
    const ctx = context();
    const help = await executeCommand("help", ctx);
    expect(help.kind).toBe("text");
    const lang = await executeCommand("lang en", ctx);
    expect(ctx.switchLanguage).toHaveBeenCalled();
    expect(lang.kind).toBe("text");
  });
});

describe("F-02 — national-ID validation never performs a network lookup", () => {
  it("keeps the checksum logic free of any network primitive", () => {
    const source = read("./kod-meli/logic.ts");
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toMatch(/XMLHttpRequest|sendBeacon|WebSocket|axios/);
  });

  it("does not send the entered code through the usage ping", () => {
    const tool = read("./kod-meli/Tool.tsx");
    const usageCall = tool.match(/trackToolUse\(([^)]*)\)/)?.[1] ?? "";
    expect(usageCall).not.toContain("value");
    expect(usageCall).not.toContain("result");
    expect(tool).not.toMatch(/apiPost<[^>]*>\(\s*["']\/tools\/kod-meli/);
  });
});

describe("F-05 — tokens are never logged, stored or uploaded", () => {
  for (const file of ["./jwt/logic.ts", "./jwt/Tool.tsx"]) {
    it(`keeps ${file} free of logging, storage and network writes`, () => {
      const source = read(file);
      expect(source).not.toMatch(/console\.(log|info|debug|warn|error)/);
      expect(source).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
      expect(source).not.toMatch(/fetch\s*\(|XMLHttpRequest|sendBeacon/);
    });
  }

  it("never places the token in the URL state", () => {
    const tool = read("./jwt/Tool.tsx");
    expect(tool).not.toMatch(/useUrlState|useSearchParams|location\.search/);
  });
});

describe("F-04 — the diff can never inject markup", () => {
  it("renders diff segments as text nodes only", () => {
    const tool = read("./matn-farsi/Tool.tsx");
    expect(tool).not.toContain("dangerouslySetInnerHTML");
    expect(tool).toContain("{segment.text}");
  });
});
