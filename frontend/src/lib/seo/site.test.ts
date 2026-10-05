import { describe, expect, it } from "vitest";

import {
  absoluteUrl,
  isNoindexPath,
  languageAlternates,
  localePath,
  mergeNoindexPaths,
  normalizePath,
  toAppLocale,
} from "@/lib/seo/site";

describe("SEO path helpers", () => {
  it("keeps Persian unprefixed and English under /en", () => {
    expect(localePath("fa", "/blog/my-post")).toBe("/blog/my-post");
    expect(localePath("en", "/blog/my-post")).toBe("/en/blog/my-post");
    expect(localePath("fa", "/")).toBe("/");
    expect(localePath("en", "/")).toBe("/en");
  });

  it("normalizes trailing slashes, duplicate slashes and queries", () => {
    expect(normalizePath("blog/post/?utm=1")).toBe("/blog/post");
    expect(normalizePath("//services//web//")).toBe("/services/web");
    expect(normalizePath("/")).toBe("/");
  });

  it("builds absolute URLs from PUBLIC_SITE_URL without duplicating slashes", () => {
    expect(absoluteUrl("fa", "/about", "https://emmett.example/")).toBe(
      "https://emmett.example/about",
    );
    expect(absoluteUrl("en", "/about", "https://emmett.example")).toBe(
      "https://emmett.example/en/about",
    );
  });

  it("emits fa-IR, en and x-default alternates", () => {
    const alternates = languageAlternates("/services", "https://emmett.example");
    expect(alternates).toEqual({
      "fa-IR": "https://emmett.example/services",
      en: "https://emmett.example/en/services",
      "x-default": "https://emmett.example/services",
    });
  });

  it("falls back to Persian for unknown locales", () => {
    expect(toAppLocale("de")).toBe("fa");
    expect(toAppLocale(undefined)).toBe("fa");
    expect(toAppLocale("en")).toBe("en");
  });

  it("matches noindex prefixes segment by segment", () => {
    const noindex = mergeNoindexPaths(["/promotions"]);
    expect(isNoindexPath("/profile", noindex)).toBe(true);
    expect(isNoindexPath("/search/", noindex)).toBe(true);
    expect(isNoindexPath("/promotions/spring", noindex)).toBe(true);
    expect(isNoindexPath("/profile-publicity", noindex)).toBe(false);
    expect(isNoindexPath("/blog", noindex)).toBe(false);
  });

  it("never duplicates paths when merging admin values", () => {
    const merged = mergeNoindexPaths(["/search", "/promotions"]);
    expect(merged.filter((path) => path === "/search")).toHaveLength(1);
  });
});
