/**
 * قرارداد دادهٔ SEO بین بک‌اند Django و فرانت‌اند (فاز ۷ — ADR-0031).
 *
 * منبع: ``GET /api/v1/seo/{settings,sitemap,redirects,faq}/`` — serializerهای
 * DRF همان فیلدها هستند و در ``/api/v1/schema/`` قابل بازبینی‌اند.
 */

export interface SeoLocale {
  code: string;
  label: string;
}

export interface SeoOrganization {
  name: string;
  legal_name: string;
  url: string;
  email: string;
  phone: string;
  address: string;
  same_as: string[];
  logo_url: string;
}

export interface SeoSettings {
  site_name: string;
  default_locale: string;
  public_site_url: string;
  locales: SeoLocale[];
  default_meta_title: string;
  default_meta_description: string;
  search_console_verification: string;
  twitter_handle: string;
  organization: SeoOrganization;
  default_og_image: string | null;
  noindex_paths: string[];
  sitemap_sections: string[];
  generated_at: string;
  two_factor_required: boolean;
  search_console_help: string;
}

export interface SitemapEntry {
  section: "pages" | "services" | "projects" | "blog" | "academy";
  path: string;
  lastmod: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: string;
}

export interface SeoRedirect {
  from_path: string;
  target: string;
  status_code: 301 | 302 | 410;
  updated_at: string;
}

export interface SeoFaqItem {
  id: number;
  question: string;
  answer: string;
}

export interface SitemapPayload {
  results: SitemapEntry[];
  sections: string[];
}

export interface RedirectPayload {
  results: SeoRedirect[];
}

export interface FaqPayload {
  results: SeoFaqItem[];
}
