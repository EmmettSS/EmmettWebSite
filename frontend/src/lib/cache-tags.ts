export const CACHE_TAGS = {
  services: "content:services",
  projects: "content:projects",
  blog: "content:blog",
  academy: "content:academy",
  company: "content:company",
  search: "search:site",
  seoSettings: "seo:settings",
  sitemap: "seo:sitemap",
  redirects: "seo:redirects",
  faqFa: "seo:faq:fa",
  faqEn: "seo:faq:en",
  siteCopyFa: "site-copy:fa",
  siteCopyEn: "site-copy:en",
  blogFeed: "feed:blog",
  academyFeed: "feed:academy",
} as const;

const allowedRevalidationTags = new Set<string>(Object.values(CACHE_TAGS));

export function isAllowedRevalidationTag(
  value: unknown,
): value is (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS] {
  return typeof value === "string" && allowedRevalidationTags.has(value);
}
