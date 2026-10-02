/**
 * F-13 — Telegram-first contact, built as a deep link (no server, cPanel-friendly).
 *
 * The handle comes from `SiteConfig`, so the team can change it in the admin without a deploy.
 * While B5 is open the API returns an empty string or the `[INPUT B5]` placeholder and the UI
 * shows an honest "not configured" state instead of a button that goes nowhere.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";

export type SiteConfigResponse = {
  brand_fa?: string;
  brand_en?: string;
  telegram_handle?: string;
  building_fa?: string;
  building_en?: string;
  lab_samples_per_day?: number | null;
  lab_turnaround_hours?: number | null;
  lab_tests_per_sample?: number | null;
};

export type ContactSource =
  | "home"
  | "services"
  | "products"
  | "projects"
  | "scanner"
  | "biolab"
  | "architect"
  | "performancelab"
  | "capabilities"
  | "contact";

/** Each source gets its own pre-filled message, in the language of the page. */
const PREFILL: Record<ContactSource, { fa: string; en: string }> = {
  home: { fa: "سلام! دربارهٔ یک پروژهٔ نرم‌افزاری/هوش مصنوعی می‌خواهم صحبت کنم.", en: "Hi! I'd like to talk about a software/AI project." },
  services: { fa: "سلام! دربارهٔ خدمات مهندسی امت سؤال دارم.", en: "Hi! I have a question about Emmett's engineering services." },
  products: { fa: "سلام! دربارهٔ محصولات امت (PenTestor / CRM) می‌خواهم بدانم.", en: "Hi! I'd like to know more about Emmett's products (PenTestor / CRM)." },
  projects: { fa: "سلام! می‌خواهم دربارهٔ یک پروژهٔ مشابه صحبت کنیم.", en: "Hi! I'd like to discuss a project similar to your work." },
  scanner: { fa: "سلام! از چک‌آپ امنیتی دامنه آمده‌ام و دربارهٔ تست نفوذ سؤال دارم.", en: "Hi! I came from the domain security check-up and have a question about penetration testing." },
  biolab: { fa: "سلام! میز کار بیوانفورماتیک را دیدم و دربارهٔ همکاری بیوتک سؤال دارم.", en: "Hi! I used the bioinformatics workbench and would like to talk about biotech work." },
  architect: { fa: "سلام! پیشنهاد معماری سایت را دیدم و می‌خواهم دربارهٔ پروژه حرف بزنیم.", en: "Hi! I used the architecture advisor and would like to discuss a project." },
  performancelab: { fa: "سلام! آزمایشگاه کارایی را دیدم؛ دربارهٔ بهبود کارایی سامانهٔ ما سؤال دارم.", en: "Hi! I saw the performance lab and have a question about improving our system's performance." },
  capabilities: { fa: "سلام! ماتریس توانمندی را دیدم و می‌خواهم دربارهٔ همکاری صحبت کنیم.", en: "Hi! I saw the capability matrix and would like to talk about working together." },
  contact: { fa: "سلام! از صفحهٔ تماس امت پیام می‌دهم.", en: "Hi! I'm writing from Emmett's contact page." },
};

export function isConfiguredHandle(handle: string | null | undefined): boolean {
  if (!handle) return false;
  const trimmed = handle.trim();
  return trimmed.length > 0 && !trimmed.includes("[INPUT") && /^[A-Za-z0-9_]{3,64}$/.test(trimmed.replace(/^@/, ""));
}

/**
 * Builds the deep link. The UTM trail travels inside the message text, which is the only
 * attribution channel a `t.me` link gives us (Telegram strips query params).
 */
export function buildTelegramLink(handle: string, source: ContactSource, lang: "fa" | "en", origin = "https://emmett.ir"): string {
  const username = handle.replace(/^@/, "").trim();
  const attribution = `${origin}/${lang}/${source === "home" ? "" : source + "/"}?utm_source=telegram&utm_medium=cta&utm_campaign=f13-${source}`;
  const text = `${PREFILL[source][lang]}\n\n[source: ${attribution}]`;
  return `https://t.me/${username}?text=${encodeURIComponent(text)}`;
}

export function useSiteConfig() {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; config: SiteConfigResponse | null }>({
    status: "loading",
    config: null,
  });

  const load = useCallback(() => {
    let cancelled = false;
    apiGet<SiteConfigResponse>("/site-config/", { timeoutMs: 8000 })
      .then((config) => {
        if (!cancelled) setState({ status: "ready", config });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", config: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  return { ...state, telegramHandle: state.config?.telegram_handle ?? null };
}
