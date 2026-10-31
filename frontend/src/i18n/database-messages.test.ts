import { describe, expect, it } from "vitest";

import { mergeDatabaseMessages } from "./database-messages";

describe("mergeDatabaseMessages", () => {
  it("overlays database strings while preserving the nested and array message shape", () => {
    const base = {
      ui: {
        hero: {
          eyebrow: "Bundled eyebrow",
          stats: [{ label: "Bundled label", value: "1" }, { label: "Second" }],
        },
      },
    };

    const merged = mergeDatabaseMessages(base, {
      "ui.hero.eyebrow": "CMS eyebrow",
      "ui.hero.stats.0.value": "2",
      "ui.footer.newLabel": "Added without changing the frontend bundle",
    });

    expect(merged).toEqual({
      ui: {
        hero: {
          eyebrow: "CMS eyebrow",
          stats: [{ label: "Bundled label", value: "2" }, { label: "Second" }],
        },
        footer: { newLabel: "Added without changing the frontend bundle" },
      },
    });
    expect(base.ui.hero.eyebrow).toBe("Bundled eyebrow");
  });

  it("ignores malformed paths and prototype-pollution attempts", () => {
    const merged = mergeDatabaseMessages(
      { ui: { hero: { title: "Original" } } },
      {
        "ui.hero.__proto__.polluted": "yes",
        "ui..hero.title": "invalid",
        "ui.hero.title": "Updated",
        "ui.hero.items.1001.name": "outside the allowed index range",
      },
    );

    expect(merged).toEqual({ ui: { hero: { title: "Updated" } } });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
