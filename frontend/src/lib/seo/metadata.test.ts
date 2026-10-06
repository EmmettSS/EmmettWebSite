import { describe, expect, it } from "vitest";

import { buildListMetadata, buildPageMetadata, ogImagePath } from "@/lib/seo/metadata";
import type { SeoSettings } from "@/lib/seo/types";

const siteUrl = "https://emmett.example";

const settings: SeoSettings = {
  site_name: "Emmett",
  default_locale: "fa",
  public_site_url: siteUrl,
  locales: [
    { code: "fa", label: "فارسی" },
    { code: "en", label: "English" },
  ],
  default_meta_title: "عنوان پیش‌فرض",
  default_meta_description: "توضیح پیش‌فرض",
  search_console_verification: "",
  twitter_handle: "@emmett",
  organization: {
    name: "Emmett",
    legal_name: "",
    url: siteUrl,
    email: "",
    phone: "",
    address: "",
    same_as: [],
    logo_url: "",
  },
  default_og_image: "/media/og-default.png",
  noindex_paths: [],
  sitemap_sections: ["pages"],
  generated_at: "2026-01-01T00:00:00Z",
  two_factor_required: false,
  search_console_help: "",
};

describe("buildPageMetadata", () => {
  it("sets a self-referencing canonical plus hreflang alternates", () => {
    const metadata = buildPageMetadata({
      locale: "en",
      path: "/blog/post-1",
      title: "Post",
      description: "Desc",
      settings,
      siteUrl,
    });

    expect(metadata.alternates?.canonical).toBe("https://emmett.example/en/blog/post-1");
    expect(metadata.alternates?.languages).toMatchObject({
      "fa-IR": "https://emmett.example/blog/post-1",
      en: "https://emmett.example/en/blog/post-1",
      "x-default": "https://emmett.example/blog/post-1",
    });
  });

  it("composes Open Graph and Twitter cards from admin settings", () => {
    const metadata = buildPageMetadata({
      locale: "fa",
      path: "/services",
      title: "خدمات",
      description: "توضیح",
      settings,
      siteUrl,
    });
    const openGraph = metadata.openGraph as Record<string, unknown>;
    const twitter = metadata.twitter as Record<string, unknown>;

    expect(openGraph.title).toBe("خدمات");
    expect(openGraph.locale).toBe("fa_IR");
    const images = (openGraph.images ?? []) as { url: string }[];
    expect(images[0]?.url).toBe("https://emmett.example/media/og-default.png");
    expect(twitter.card).toBe("summary_large_image");
    expect(twitter.site).toBe("@emmett");
  });

  it("falls back to admin defaults when the page has no SEO text", () => {
    const metadata = buildPageMetadata({
      locale: "fa",
      path: "/about",
      title: "   ",
      description: null,
      settings,
      siteUrl,
    });

    expect(metadata.title).toBe("عنوان پیش‌فرض");
    expect(metadata.description).toBe("توضیح پیش‌فرض");
  });

  it("marks private pages as noindex", () => {
    const metadata = buildPageMetadata({
      locale: "fa",
      path: "/profile",
      title: "پروفایل",
      settings,
      siteUrl,
      noindex: true,
    });

    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("falls back to the dynamic per-locale OG image when no admin image exists", () => {
    const withoutImage: SeoSettings = { ...settings, default_og_image: "" };
    const fa = buildPageMetadata({
      locale: "fa",
      path: "/services",
      title: "خدمات",
      description: "توضیح",
      settings: withoutImage,
      siteUrl,
    });
    const en = buildPageMetadata({
      locale: "en",
      path: "/services",
      title: "Services",
      description: "Desc",
      settings: withoutImage,
      siteUrl,
    });
    const faImages = (fa.openGraph?.images ?? []) as { url: string }[];
    const enImages = (en.openGraph?.images ?? []) as { url: string }[];

    expect(faImages[0]?.url).toBe("https://emmett.example/opengraph-image");
    expect(enImages[0]?.url).toBe("https://emmett.example/en/opengraph-image");
    expect((fa.twitter as Record<string, unknown>).card).toBe("summary_large_image");
  });

  it("keeps indexable pages crawlable with image previews", () => {
    const metadata = buildPageMetadata({
      locale: "fa",
      path: "/blog",
      title: "بلاگ",
      settings,
      siteUrl,
    });

    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    });
  });

  it("declares the RSS alternate when asked", () => {
    const metadata = buildPageMetadata({
      locale: "en",
      path: "/blog",
      title: "Blog",
      settings,
      siteUrl,
      rssPath: "/blog/rss",
    });

    expect(metadata.alternates?.types?.["application/rss+xml"]).toBe(
      "https://emmett.example/en/blog/rss",
    );
  });

  it("supports article publishedTime, buildListMetadata, and ogImagePath", () => {
    const articleMeta = buildPageMetadata({
      locale: "fa",
      path: "/blog/post-1",
      title: "مقاله",
      type: "article",
      publishedTime: "2026-01-01T00:00:00Z",
      authors: ["Emmett"],
      tags: ["Django"],
      settings: { ...settings, twitter_handle: "" },
      siteUrl,
    });
    expect((articleMeta.openGraph as Record<string, unknown>).publishedTime).toBe(
      "2026-01-01T00:00:00Z",
    );

    const listMeta = buildListMetadata({
      locale: "en",
      path: "/projects",
      title: "Projects",
      settings,
      siteUrl,
    });
    expect(listMeta.title).toBe("Projects");
    expect(ogImagePath("en", "/opengraph-image")).toBe("/en/opengraph-image");
  });
});
