import { getTranslations } from "next-intl/server";

import { Loader } from "@/components/ui-port/loader";
import { Navbar } from "@/components/ui-port/navbar";
import { UiMotion } from "@/components/ui-port/ui-motion";

/**
 * پوستهٔ گروه مسیر `(ui)` — پورت ۱:۱ بستهٔ طراحی UI به Next.js.
 *
 * معادل دقیق درخت `UI/src/app/App.tsx`:
 *   <AnimatePresence>{loading && <Loader />}</AnimatePresence>
 *   <motion.div className="min-h-screen bg-[#0B1F18] text-foreground overflow-x-hidden">
 *     <Navbar />
 *     …مسیر فعلی…
 *   </motion.div>
 *
 * تفاوت‌های عامدانه و دلیل هرکدام:
 *  ۱) توکن‌های UI روی `:root` هستند (فاز ۷). پوشش `ui-theme` برداشته شده.
 *  ۲) محتوای صفحه همیشه رندر می‌شود (در UI تا پایان لودر رندر نمی‌شد)؛ اما
 *     لودر تمام‌صفحه و مات است، پس تجربهٔ بصری کاربر یکی است و در عوض صفحه
 *     برای موتور جست‌وجو/بدون‌JS محتوا دارد.
 *  ۳) فید ورود `motion.div` با همان مقدارهای UI (opacity ۰→۱، ۰.۴s) به‌صورت
 *     انیمیشن CSS (`.ui-shell`) پیاده شده تا با JS غیرفعال هم صفحه دیده شود.
 *  ۴) لینک «پرش به محتوا» (Skip link) افزوده شده — نامرئی است مگر با
 *     کیبورد، و معیار دسترس‌پذیری پروژه (Lighthouse a11y) است.
 *  ۵) `UiMotion` فقط انیمیشن‌های `motion` همین پوسته را به
 *     `prefers-reduced-motion` وصل می‌کند.
 */
export default async function UiLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tCommon = await getTranslations({ locale, namespace: "common" });

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {tCommon("skipToContent")}
      </a>
      <UiMotion>
        <Loader />
        <div className="ui-shell min-h-screen overflow-x-hidden bg-background text-foreground">
          <Navbar />
          <main id="main-content">{children}</main>
        </div>
      </UiMotion>
    </>
  );
}
