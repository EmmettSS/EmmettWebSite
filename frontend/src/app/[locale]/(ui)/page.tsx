import { getTranslations, setRequestLocale } from "next-intl/server";

import { JsonLd } from "@/components/seo/json-ld";
import { Home } from "@/components/ui-port/home";
import {
  mapArticles,
  mapCourses,
  mapProducts,
  mapProjects,
  mapServices,
} from "@/components/ui-port/home-data";
import type { AppLocale } from "@/i18n/routing";
import { getBlogPosts, getCourses, getProjects, getServices } from "@/lib/api/server";
import { getFaqForPath } from "@/lib/api/seo";
import { faqJsonLd } from "@/lib/seo/json-ld";

/**
 * صفحهٔ اصلی — پورت ۱:۱ بستهٔ UI (فاز ۲).
 *
 * ترکیب بخش‌ها عیناً همان `UI/src/app/pages/Home.tsx` است. تنها افزودهٔ این
 * لایه، JSON-LD پرسش‌های متداول از بک‌اند است (مسیر ``/``) که پیش‌تر هم در
 * همین صفحه بود و برای سئو حفظ شده؛ اگر ادمین هیچ FAQItem نداشته باشد بلوک
 * ساخت‌یافته اصلاً رندر نمی‌شود.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  const academy = await getTranslations({ locale, namespace: "academy" });
  const library = await getTranslations({ locale, namespace: "ui.library" });
  const list = "page_size=100";
  const [faqItems, services, products, projects, posts, courses] = await Promise.all([
    getFaqForPath("/", locale),
    getServices(locale, `${list}&ordering=order`),
    getProjects(locale, `is_product=true&${list}&ordering=order`),
    getProjects(locale, `${list}&ordering=-year`),
    getBlogPosts(locale, `${list}&ordering=-published_at`),
    getCourses(locale, `${list}&ordering=order`),
  ]);

  return (
    <>
      <JsonLd data={faqJsonLd(faqItems)} />
      <Home
        content={{
          services: services ? mapServices(services) : null,
          products: products ? mapProducts(products) : null,
          projects: projects ? mapProjects(projects) : null,
          projectTotal: projects?.count ?? 0,
          articles: posts ? mapArticles(posts, locale, library("minute")) : null,
          courses: courses
            ? mapCourses(courses, (level) => academy(`levels.${level}`), academy("hours"))
            : null,
        }}
      />
    </>
  );
}
