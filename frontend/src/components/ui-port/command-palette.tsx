"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Search } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { globalSearch } from "@/lib/api/client";
import type { SearchResult } from "@/lib/api/types";

import { useDialogA11y } from "./dialog-a11y";

export type PaletteItem = { label: string; category: string; href: string };

type PaletteRow = PaletteItem & { key: string };

/** آخرین پاسخ کامل API؛ وضعیت loading از ناهم‌خوانی کوئری مشتق می‌شود. */
type ApiSnapshot = { query: string; status: "done" | "error"; results: SearchResult[] };

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const MAX_API_RESULTS = 8;

/**
 * پالت فرمان ⌘K — در همان درخت پوسته (`.ui-shell`) رندر می‌شود، نه Portal.
 *
 * قید معماری (ADR-0037): از فاز ۷ توکن‌ها روی `:root` هستند و کلاس قدیمی
 * `.ui-theme` وجود ندارد؛ معادل امروزی «داخل ui-theme بمان» این است که پالت
 * داخل محدودهٔ پوسته/توکن بماند و با `useDialogA11y` (تلهٔ فوکوس، `inert`
 * روی `main`، بازگرداندن فوکوس) کار کند. اگر روزی Portal شود، باید صریحاً
 * همین رنگ‌ها/قواعد را با خود ببرد و این قراردادها را با تست رگرسیون نگه
 * دارد (`command-palette.test.tsx`).
 *
 * رفتار جست‌وجو: فهرست ثابت صفحات مثل قبل بی‌واسطه فیلتر می‌شود؛ از دو
 * نویسه به بالا، همان FTS بک‌اند صفحهٔ `/search` با debounce صدا زده
 * می‌شود (`globalSearch` — بدون هیچ تغییر بک‌اند). نتایج در بخش جدا
 * می‌آیند و ردیف «مشاهدهٔ همهٔ نتایج» جست‌وجوی کامل را به `/search?q=…`
 * می‌سپارد. ناوبری کیبورد: جهت‌نماها بین ردیف‌ها فوکوس را جابه‌جا می‌کنند
 * و Enter ردیف فعال را باز می‌کند (از ورودی، Enter ردیف فعال/اول است).
 */
export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
}) {
  const t = useTranslations("ui.nav");
  const nav = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [api, setApi] = useState<ApiSnapshot | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const requestSeq = useRef(0);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const trimmed = query.trim();

  // هر بستن، پالت را برای بازشدن بعدی از صفر شروع می‌کند (همان رفتار قبلی
  // که انتخاب/بستن کوئری را خالی می‌کرد) — بدون افکت و setState اضافی.
  const handleClose = useCallback(() => {
    setQuery("");
    setApi(null);
    setActiveIndex(0);
    onClose();
  }, [onClose]);
  const dialogRef = useDialogA11y(open, handleClose);

  const pageRows: PaletteRow[] = (
    trimmed
      ? items.filter(
          (item) =>
            item.label.toLowerCase().includes(trimmed.toLowerCase()) ||
            item.category.toLowerCase().includes(trimmed.toLowerCase()),
        )
      : items
  ).map((item) => ({ ...item, key: `page-${item.href}` }));

  // جست‌وجوی API با debounce و گارد پاسخ کهنه: فقط آخرین درخواست اجازهٔ
  // به‌روزرسانی دارد، پس پاسخ دیررسیدهٔ کوئری قبلی روی نتیجهٔ تازه نمی‌نشیند.
  // وضعیت «در حال جست‌وجو» state جدا نیست؛ از این‌که اسنپ‌شات API هنوز برای
  // کوئری فعلی نیست مشتق می‌شود.
  useEffect(() => {
    if (!open || trimmed.length < MIN_QUERY_LENGTH) return;
    const seq = ++requestSeq.current;
    const timer = window.setTimeout(() => {
      globalSearch(trimmed, locale)
        .then((response) => {
          if (requestSeq.current !== seq) return;
          setApi({
            query: trimmed,
            status: "done",
            results: response.results.slice(0, MAX_API_RESULTS),
          });
        })
        .catch(() => {
          if (requestSeq.current !== seq) return;
          setApi({ query: trimmed, status: "error", results: [] });
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, trimmed, locale]);

  const apiStatus: "idle" | "loading" | "done" | "error" =
    trimmed.length < MIN_QUERY_LENGTH ? "idle" : api?.query === trimmed ? api.status : "loading";
  const apiRows: PaletteRow[] = (api?.query === trimmed ? api.results : []).map((result) => ({
    key: `api-${result.content_type}-${result.public_id}`,
    label: result.title,
    category: result.category_label,
    href: result.url_path,
  }));

  const rows = [...pageRows, ...apiRows];

  // با هر کوئری تازه، ردیف فعال به اول برمی‌گردد (الگوی «تنظیم state هنگام
  // رندر» ری‌اکت، نه افکت).
  const [previousTrimmed, setPreviousTrimmed] = useState(trimmed);
  if (trimmed !== previousTrimmed) {
    setPreviousTrimmed(trimmed);
    setActiveIndex(0);
  }

  const activate = useCallback(
    (row: PaletteRow) => {
      router.push(row.href);
      handleClose();
    },
    [router, handleClose],
  );

  const viewAll = useCallback(() => {
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    handleClose();
  }, [router, handleClose, trimmed]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (rows.length === 0) return;
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const focusedIndex = rowRefs.current.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        focusedIndex === -1
          ? direction === 1
            ? 0
            : rows.length - 1
          : (focusedIndex + direction + rows.length) % rows.length;
      setActiveIndex(next);
      rowRefs.current[next]?.focus();
      return;
    }
    // Enter روی ورودی: ردیف فعال (یا اگر ردیفی نیست، همهٔ نتایج در /search).
    if (event.key === "Enter" && document.activeElement?.tagName === "INPUT") {
      const row = rows[activeIndex] ?? rows[0];
      if (row) {
        event.preventDefault();
        activate(row);
      } else if (trimmed) {
        event.preventDefault();
        viewAll();
      }
    }
  };

  if (!open) return null;

  const showSearchSection = trimmed.length >= MIN_QUERY_LENGTH;
  const showGlobalEmpty =
    trimmed.length > 0 && pageRows.length === 0 && apiStatus === "done" && apiRows.length === 0;

  const renderRow = (row: PaletteRow, index: number) => (
    <button
      key={row.key}
      ref={(element) => {
        rowRefs.current[index] = element;
      }}
      type="button"
      role="option"
      id={`command-palette-option-${index}`}
      aria-selected={index === activeIndex}
      onFocus={() => setActiveIndex(index)}
      onMouseEnter={() => setActiveIndex(index)}
      onClick={() => activate(row)}
      className={`w-full flex items-center justify-between px-4 py-3 transition-colors group text-start ${
        index === activeIndex ? "bg-[rgba(31,174,110,0.06)]" : ""
      } hover:bg-[rgba(31,174,110,0.06)]`}
    >
      <span className="flex items-center gap-3">
        <ChevronRight
          className="w-3 h-3 text-[rgba(243,250,246,0.18)] group-hover:text-primary transition-colors rtl:-scale-x-100"
          aria-hidden
        />
        <span className="text-sm text-[rgba(243,250,246,0.55)] group-hover:text-foreground transition-colors font-mono">
          {row.label}
        </span>
      </span>
      <span className="text-[10px] font-mono text-[rgba(243,250,246,0.35)] uppercase tracking-widest">
        {row.category}
      </span>
    </button>
  );

  const sectionHeading = (label: string) => (
    <div className="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-[rgba(243,250,246,0.35)]">
      {label}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] px-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-[#07130F]/75 backdrop-blur-sm" />
      <motion.div
        ref={dialogRef}
        id="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label={nav("search")}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-[560px] rounded-xl border border-[rgba(31,174,110,0.15)] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.5)]"
        style={{ background: "rgba(11,31,24,0.98)" }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[rgba(31,174,110,0.1)]">
          <Search className="w-4 h-4 text-[rgba(243,250,246,0.3)] flex-shrink-0" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="flex-1 bg-transparent text-foreground font-mono text-sm placeholder:text-[rgba(243,250,246,0.35)] outline-none"
          />
          <kbd className="text-[10px] font-mono text-[rgba(243,250,246,0.35)] border border-input rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto py-2" role="listbox" id="command-palette-list">
          {showGlobalEmpty ? (
            <div className="px-4 py-8 text-center text-sm text-[rgba(243,250,246,0.35)] font-mono">
              {t("noResults")}
            </div>
          ) : (
            <>
              {trimmed && pageRows.length > 0 ? sectionHeading(t("pagesHeading")) : null}
              {pageRows.map((row, index) => renderRow(row, index))}

              {showSearchSection ? sectionHeading(t("resultsHeading")) : null}
              {showSearchSection && apiStatus === "loading" ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="px-4 py-2 text-xs font-mono text-[rgba(243,250,246,0.35)]"
                >
                  {t("searching")}
                </div>
              ) : null}
              {showSearchSection && apiStatus === "error" ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="px-4 py-2 text-xs font-mono text-[rgba(243,250,246,0.35)]"
                >
                  {t("searchError")}
                </div>
              ) : null}
              {showSearchSection && apiStatus === "done" && apiRows.length === 0 ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="px-4 py-2 text-xs font-mono text-[rgba(243,250,246,0.35)]"
                >
                  {t("noResults")}
                </div>
              ) : null}
              {apiRows.map((row, offset) => renderRow(row, pageRows.length + offset))}
            </>
          )}
        </div>

        {trimmed ? (
          <button
            type="button"
            onClick={viewAll}
            className="w-full flex items-center justify-between px-4 py-3 border-t border-[rgba(31,174,110,0.1)] hover:bg-[rgba(31,174,110,0.06)] transition-colors text-start"
          >
            <span className="text-sm font-mono text-primary">
              {t("viewAllResults", { query: trimmed })}
            </span>
            <kbd
              className="text-[10px] font-mono text-[rgba(243,250,246,0.35)] border border-input rounded px-1.5 py-0.5"
              aria-hidden
            >
              ↵
            </kbd>
          </button>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
