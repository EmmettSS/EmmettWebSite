import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import fa from "../../messages/fa.json";
import { localeDirections } from "./routing";

function keyTree(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => keyTree(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return [path, ...keyTree(child, path)];
    });
  }
  return [];
}

describe("bilingual messages", () => {
  it("keeps fa and en message trees aligned, including the UI shell", () => {
    expect(keyTree(fa)).toEqual(keyTree(en));
    expect(keyTree(en).some((key) => key.startsWith("ui."))).toBe(true);
  });

  it("sets Persian to RTL and English to LTR", () => {
    expect(localeDirections.fa).toBe("rtl");
    expect(localeDirections.en).toBe("ltr");
  });
});
