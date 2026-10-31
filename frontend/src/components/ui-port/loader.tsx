"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * لودر آغازین — پورت ۱:۱ `UI/src/app/components/Loader.tsx` (فاز ۲).
 *
 * جریان نمایش مو‌به‌مو همان بستهٔ UI است: نوار پیشرفت هر ۲۵ms دو درصد جلو
 * می‌رود، ۳۰۰ms توقف و سپس محو شدن (exit با duration ۰.۴). تنها افزودهٔ این
 * نسخه، احترام به `prefers-reduced-motion` است — همان‌طور که قاعدهٔ سراسری
 * globals.css هم همهٔ انیمیشن‌ها را در این حالت خنثی می‌کند: پوشش با قاعدهٔ
 * CSS (`.ui-loader` در ui-theme.css) پنهان می‌شود و اینجا فقط تایمر شروع
 * نمی‌شود تا کاری بی‌دلیل اجرا نشود.
 */
export function Loader() {
  const t = useTranslations("ui.loader");
  const brand = useTranslations("ui");
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    // پیشرفت ظاهری سقف دارد (همان ۱٫۲۵ ثانیهٔ بستهٔ UI)، اما اگر بارگذاری
    // واقعی صفحه زودتر تمام شده باشد، نگه‌داشتن پوشش تا پایان شمارندهٔ
    // ساختگی فقط تأخیر است: با رویداد load بلافاصله کامل می‌شود. روی
    // اتصال‌های کند همان رفتار قبلی (پایان شمارنده) حاکم است.
    let finished = false;
    let current = 0;
    let hideTimer: number | undefined;
    const interval = window.setInterval(() => {
      current = Math.min(100, current + 2);
      setProgress(current);
      if (current >= 100) {
        finish();
      }
    }, 25);
    function finish() {
      if (finished) return;
      finished = true;
      window.clearInterval(interval);
      setProgress(100);
      hideTimer = window.setTimeout(() => setVisible(false), 300);
    }
    if (document.readyState === "complete") {
      finish();
    } else {
      window.addEventListener("load", finish, { once: true });
    }
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(hideTimer);
      window.removeEventListener("load", finish);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          aria-hidden
          className="ui-loader fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "var(--deep-green-black)" }}
        >
          <div className="text-center space-y-8">
            <div className="font-mono text-5xl tracking-[0.2em] text-foreground font-semibold">
              {brand("brand")}
            </div>

            <div className="space-y-3 w-72 mx-auto">
              <div className="flex items-center justify-between text-xs font-mono text-[rgba(243,250,246,0.28)]">
                <span>{t("initializing")}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-px bg-[rgba(31,174,110,0.12)] overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>

            <p className="text-xs font-mono text-[rgba(243,250,246,0.2)] tracking-widest">
              {t("collective")}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
