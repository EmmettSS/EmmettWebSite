/**
 * سازنده‌های JSON-LD (فاز ۷ — ADR-0031).
 *
 * شش نوع ساخت‌یافتهٔ مورد نیاز پروژه: Organization، WebSite (+SearchAction)،
 * BreadcrumbList، Article، Course و FAQPage. توابع این فایل **خالص** هستند
 * (بدون React/شبکه) تا در تست‌های واحد قابل بازرسی باشند؛ کامپوننت رندر در
 * ``src/components/seo/json-ld.tsx`` است.
 *
 * همهٔ URLها مطلق‌اند (الزام Google: ``item`` در BreadcrumbList و ``url`` در
 * Article باید مطلق باشد) و از ``siteUrl``/``localePath`` ساخته می‌شوند.
 */

import type { AppLocale } from "@/i18n/routing";
import { LOCALE_LANGUAGE_TAG, absoluteUrl, localePath } from "@/lib/seo/site";
import type { SeoFaqItem, SeoSettings } from "@/lib/seo/types";

export interface JsonLdGraph {
  "@context": "https://schema.org";
  "@graph": Record<string, unknown>[];
}

export interface Crumb {
  name: string;
  path: string;
}

function organizationNode(settings: SeoSettings, siteUrl: string): Record<string, unknown> {
  const organization = settings.organization;
  const node: Record<string, unknown> = {
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: organization.name || settings.site_name,
    url: `${siteUrl}/`,
  };
  if (organization.legal_name) node.legalName = organization.legal_name;
  if (organization.logo_url) node.logo = organization.logo_url;
  if (organization.email) node.email = organization.email;
  if (organization.phone) node.telephone = organization.phone;
  if (organization.address) {
    node.address = { "@type": "PostalAddress", streetAddress: organization.address };
  }
  const sameAs = organization.same_as.filter(Boolean);
  if (sameAs.length > 0) node.sameAs = sameAs;
  return node;
}

function websiteNode(
  settings: SeoSettings,
  siteUrl: string,
  locale: AppLocale,
): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: settings.site_name,
    url: absoluteUrl(locale, "/", siteUrl),
    inLanguage: LOCALE_LANGUAGE_TAG[locale],
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(locale, "/search", siteUrl)}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** گراف پایهٔ هر صفحه: Organization + WebSite. */
export function siteJsonLd(
  settings: SeoSettings,
  siteUrl: string,
  locale: AppLocale,
): JsonLdGraph {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationNode(settings, siteUrl), websiteNode(settings, siteUrl, locale)],
  };
}

/** BreadcrumbList — ترتیب همان مسیر بصری صفحه است. */
export function breadcrumbJsonLd(
  crumbs: Crumb[],
  siteUrl: string,
  locale: AppLocale,
): JsonLdGraph {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(locale, crumb.path, siteUrl),
        })),
      },
    ],
  };
}

export interface ArticleInput {
  title: string;
  description: string;
  path: string;
  imageUrl: string | null;
  publishedAt: string | null;
  authorName: string | null;
  section?: string;
  tags?: string[];
}

/** Article — برای نوشتهٔ بلاگ و مطالعهٔ موردی پروژه‌ها. */
export function articleJsonLd(
  input: ArticleInput,
  settings: SeoSettings,
  siteUrl: string,
  locale: AppLocale,
): JsonLdGraph {
  const node: Record<string, unknown> = {
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(locale, input.path, siteUrl),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(locale, input.path, siteUrl) },
    inLanguage: LOCALE_LANGUAGE_TAG[locale],
    publisher: { "@id": `${siteUrl}/#organization` },
  };
  if (input.imageUrl) node.image = [input.imageUrl];
  if (input.publishedAt) node.datePublished = input.publishedAt;
  if (input.publishedAt) node.dateModified = input.publishedAt;
  if (input.authorName) node.author = { "@type": "Person", name: input.authorName };
  if (input.section) node.articleSection = input.section;
  if (input.tags?.length) node.keywords = input.tags.join(", ");
  return {
    "@context": "https://schema.org",
    "@graph": [node, organizationNode(settings, siteUrl)],
  };
}

export interface CourseInput {
  name: string;
  description: string;
  path: string;
  imageUrl: string | null;
  level: string;
  durationHours: number;
  instructorName: string | null;
}

/** Course — برای صفحه‌های آکادمی. */
export function courseJsonLd(
  input: CourseInput,
  settings: SeoSettings,
  siteUrl: string,
  locale: AppLocale,
): JsonLdGraph {
  const node: Record<string, unknown> = {
    "@type": "Course",
    name: input.name,
    description: input.description,
    url: absoluteUrl(locale, input.path, siteUrl),
    inLanguage: LOCALE_LANGUAGE_TAG[locale],
    provider: { "@id": `${siteUrl}/#organization` },
  };
  if (input.imageUrl) node.image = [input.imageUrl];
  if (input.level) {
    node.educationalLevel = input.level;
  }
  if (input.durationHours > 0) {
    node.timeRequired = `PT${Math.round(input.durationHours)}H`;
  }
  if (input.instructorName) {
    node.hasCourseInstance = {
      "@type": "CourseInstance",
      courseMode: "online",
      instructor: { "@type": "Person", name: input.instructorName },
    };
  }
  return {
    "@context": "https://schema.org",
    "@graph": [node, organizationNode(settings, siteUrl)],
  };
}

/** FAQPage — از ``FAQItem``های ادمین برای همان مسیر. */
export function faqJsonLd(items: SeoFaqItem[]): JsonLdGraph | null {
  const usable = items.filter((item) => item.question && item.answer);
  if (usable.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: usable.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

/** Service — کارت خدمت‌های ویترین (نوع اضافی مجاز، نه اجباری). */
export function serviceJsonLd(
  input: { name: string; description: string; path: string },
  settings: SeoSettings,
  siteUrl: string,
  locale: AppLocale,
): JsonLdGraph {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: input.name,
        description: input.description,
        url: absoluteUrl(locale, input.path, siteUrl),
        provider: { "@id": `${siteUrl}/#organization` },
        areaServed: { "@type": "Country", name: "IR" },
      },
      organizationNode(settings, siteUrl),
    ],
  };
}

/** مسیر canonical صفحه به‌صورت مطلق (برای OG/JSON-LD). */
export function pageUrl(locale: AppLocale, path: string, siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, "")}${localePath(locale, path)}`;
}
