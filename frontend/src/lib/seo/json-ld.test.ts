import { describe, expect, it } from "vitest";

import {
  articleJsonLd,
  breadcrumbJsonLd,
  courseJsonLd,
  faqJsonLd,
  serviceJsonLd,
  siteJsonLd,
} from "@/lib/seo/json-ld";
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
  default_meta_title: "امیت",
  default_meta_description: "استودیوی مهندسی نرم‌افزار",
  search_console_verification: "",
  twitter_handle: "emmett",
  organization: {
    name: "امیت",
    legal_name: "امیت گروپ",
    url: siteUrl,
    email: "hi@emmett.example",
    phone: "+982100000000",
    address: "تهران",
    same_as: ["https://linkedin.com/company/emmett"],
    logo_url: `${siteUrl}/brand/logo.png`,
  },
  default_og_image: null,
  noindex_paths: ["/profile"],
  sitemap_sections: ["pages"],
  generated_at: "2026-01-01T00:00:00Z",
  two_factor_required: true,
  search_console_help: "",
};

function nodeAt(graph: { "@graph": Record<string, unknown>[] }, index = 0): Record<string, unknown> {
  return graph["@graph"][index] as Record<string, unknown>;
}

describe("JSON-LD builders", () => {
  it("builds Organization + WebSite with a SearchAction for each locale", () => {
    const graph = siteJsonLd(settings, siteUrl, "en");
    const organization = nodeAt(graph);
    const website = nodeAt(graph, 1);

    expect(graph["@context"]).toBe("https://schema.org");
    expect(organization["@type"]).toBe("Organization");
    expect(organization.name).toBe("امیت");
    expect(organization.legalName).toBe("امیت گروپ");
    expect(website["@type"]).toBe("WebSite");
    expect(website.inLanguage).toBe("en");
    const action = website.potentialAction as { target: { urlTemplate: string } };
    expect(action.target.urlTemplate).toContain("https://emmett.example/en/search");
  });

  it("builds BreadcrumbList with absolute item URLs", () => {
    const graph = breadcrumbJsonLd(
      [
        { name: "بلاگ", path: "/blog" },
        { name: "پست", path: "/blog/post-1" },
      ],
      siteUrl,
      "fa",
    );
    const list = nodeAt(graph);
    const items = list.itemListElement as Record<string, unknown>[];

    expect(list["@type"]).toBe("BreadcrumbList");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      position: 1,
      name: "بلاگ",
      item: "https://emmett.example/blog",
    });
  });

  it("builds Article with publisher, author and image", () => {
    const graph = articleJsonLd(
      {
        title: "مهندسی سیستم",
        description: "خلاصه",
        path: "/blog/system-engineering",
        imageUrl: "https://emmett.example/media/cover.webp",
        publishedAt: "2026-02-01T10:00:00Z",
        authorName: "نویسنده",
        section: "بلاگ",
        tags: ["مهندسی", "سیستم"],
      },
      settings,
      siteUrl,
      "fa",
    );
    const node = nodeAt(graph);

    expect(node["@type"]).toBe("Article");
    expect(node.datePublished).toBe("2026-02-01T10:00:00Z");
    expect(node.keywords).toBe("مهندسی, سیستم");
    expect((node.publisher as { "@id": string })["@id"]).toBe(
      "https://emmett.example/#organization",
    );
  });

  it("builds Course with level, duration and instructor", () => {
    const graph = courseJsonLd(
      {
        name: "دورهٔ معماری",
        description: "توضیح",
        path: "/academy/architecture",
        imageUrl: null,
        level: "پیشرفته",
        durationHours: 12,
        instructorName: "مدرس",
      },
      settings,
      siteUrl,
      "fa",
    );
    const node = nodeAt(graph);

    expect(node["@type"]).toBe("Course");
    expect(node.educationalLevel).toBe("پیشرفته");
    expect(node.timeRequired).toBe("PT12H");
    expect(node.hasCourseInstance).toMatchObject({
      instructor: { "@type": "Person", name: "مدرس" },
    });
  });

  it("builds FAQPage only when items exist", () => {
    expect(faqJsonLd([])).toBeNull();
    expect(faqJsonLd([{ id: 1, question: "", answer: "" }])).toBeNull();

    const graph = faqJsonLd([{ id: 1, question: "سؤال؟", answer: "پاسخ." }]);
    const node = nodeAt(graph as { "@graph": Record<string, unknown>[] });
    const questions = node.mainEntity as Record<string, unknown>[];

    expect(node["@type"]).toBe("FAQPage");
    expect(questions[0]).toMatchObject({
      "@type": "Question",
      name: "سؤال؟",
      acceptedAnswer: { "@type": "Answer", text: "پاسخ." },
    });
  });

  it("builds Service with provider reference", () => {
    const graph = serviceJsonLd(
      { name: "طراحی", description: "توضیح", path: "/services/design" },
      settings,
      siteUrl,
      "fa",
    );
    const node = nodeAt(graph);

    expect(node["@type"]).toBe("Service");
    expect(node.url).toBe("https://emmett.example/services/design");
    expect(node.areaServed).toMatchObject({ name: "IR" });
  });
});
