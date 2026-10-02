import { describe, expect, it } from "vitest";
import { classifyKey, commandFromSearch, pushHistory } from "./logic";

describe("terminal helpers", () => {
  it("bounds the command history", () => {
    const history = Array.from({ length: 90 }, (_, index) => ({ command: `c${index}`, response: { kind: "text" as const, text: "" } }));
    const next = pushHistory(history, { command: "last", response: { kind: "text", text: "" } }, 80);
    expect(next).toHaveLength(80);
    expect(next.at(-1)?.command).toBe("last");
  });

  it("reads deep links and classifies keys", () => {
    expect(commandFromSearch("?cmd=status")).toBe("status");
    expect(commandFromSearch("")).toBe("");
    expect(classifyKey("Tab")).toBe("Tab");
    expect(classifyKey("a")).toBe("other");
  });
});
