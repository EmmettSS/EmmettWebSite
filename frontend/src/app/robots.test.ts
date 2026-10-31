import { beforeEach, describe, expect, it, vi } from "vitest";

import robots from "./robots";

const { getSeoSettingsMock } = vi.hoisted(() => ({ getSeoSettingsMock: vi.fn() }));

vi.mock("@/lib/api/seo", () => ({ getSeoSettingsOrDefaults: getSeoSettingsMock }));

describe("robots.txt", () => {
  beforeEach(() => {
    getSeoSettingsMock.mockResolvedValue({
      public_site_url: "https://emmett.ir",
      noindex_paths: [],
    });
  });

  it("keeps direct Django Passenger routes out of search indexes", async () => {
    const response = await robots();
    const rules = Array.isArray(response.rules) ? response.rules : [response.rules];
    const disallow = rules.flatMap((rule) => rule.disallow ?? []);

    expect(disallow).toContain("/backend/");
    expect(response.sitemap).toBe("https://emmett.ir/sitemap.xml");
  });
});
