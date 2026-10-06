import { setRequestLocale } from "next-intl/server";

import { JsonLd } from "@/components/seo/json-ld";
import { Hero } from "@/components/organisms/hero";
import type { AppLocale } from "@/i18n/routing";
import { getFaqForPath } from "@/lib/api/seo";
import { faqJsonLd } from "@/lib/seo/json-ld";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  // پرسش‌های متداول صفحهٔ اصلی از ``FAQItem``های ادمین می‌آیند (مسیر ``/``)؛
  // اگر مدخلی نباشد، بلوک JSON-LD اصلاً رندر نمی‌شود (نه خالی، نه نامعتبر).
  const faqItems = await getFaqForPath("/", locale);

  return (
    <>
      <JsonLd data={faqJsonLd(faqItems)} />
      <Hero />
    </>
  );
}
