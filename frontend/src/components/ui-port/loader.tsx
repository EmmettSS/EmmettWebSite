"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * لودر آغازین — پورت بصری `UI/src/app/components/Loader.tsx` با بودجهٔ زمانی
 * سخت‌گیرانه (ADR-0041).
 *
 * چه چیزی عوض شد و چرا؟
 * نسخهٔ قبلی تا رویداد ``window.load`` صبر می‌کرد. ``load`` یعنی «همهٔ تصاویر،
 * فونت‌ها و chunkهای داینامیک دانلود شده‌اند» — روی موبایل/هاست اشتراکی این
 * می‌تواند چند ثانیه طول بکشد، در حالی که HTML صفحه از قبل آماده و رندرشده
 * است. نتیجه: پوشش تمام‌صفحه با نوار پیشرفت *ساختگی* روی محتوایی که حاضر است.
 *
 * رفتار جدید: حداکثر ۷۵۰ میلی‌ثانیه (۵۰۰ms پیشرفت + ۲۵۰ms محو شدن) و مستقل
 * از شبکه. هیچ‌گاه منتظر ``load``، تصاویر یا chunkهای سه‌بعدی نمی‌ماند. اگر
 * کاربر ``prefers-reduced-motion`` خواسته باشد، لودر اصلاً نمایش داده نمی‌شود.
 */
const PROGRESS_STEP_MS = 20;
const PROGRESS_STEP = 4;
const HOLD_AFTER_COMPLETE_MS = 250;

export function Loader() {
  const t = useTranslations("ui.loader");
  const brand = useTranslations("ui");
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // `prefers-reduced-motion` با قاعدهٔ CSS `.ui-loader` در ui-theme.css
    // خنثی می‌شود (نمایش: none)؛ این‌جا فقط تایمر اجرا می‌شود تا حالت‌های
    // غیر-reduced رفتار یکسان داشته باشند.
    let current = 0;
    let hideTimer: number | undefined;
    const interval = window.setInterval(() => {
      current = Math.min(100, current + PROGRESS_STEP);
      setProgress(current);
      if (current >= 100) {
        window.clearInterval(interval);
        hideTimer = window.setTimeout(() => setVisible(false), HOLD_AFTER_COMPLETE_MS);
      }
    }, PROGRESS_STEP_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
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
