import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, Loader2, Sparkles } from "lucide-react";
import { useI18n } from "@/app/i18n";
import { toolsCopy } from "@/content/tools";
import { useTier } from "@/lib/device-tier";
import { apiGet } from "@/lib/api-client";
import { toPersianDigits } from "@/lib/jalali";
import { useDebounced, useShareLink, useUrlState, trackToolUse } from "../hooks";
import { ShareBar } from "../ui/ShareBar";
import {
  BULK_MAX_LINES,
  NOROOZ,
  YALDA,
  addWorkingDays,
  bulkToCsv,
  convertBulk,
  convertGregorian,
  convertJalali,
  diffDates,
  distanceToAnnual,
  formatGregorian,
  jalaliToday,
  nthWeekdayOfMonth,
  type HolidayMap,
  type WorkdayPlan,
} from "./logic";

type Tab = "convert" | "calc" | "bulk";
type Direction = "to-gregorian" | "to-jalali";

const TABS: { id: Tab; fa: string; en: string }[] = [
  { id: "convert", fa: "تبدیل", en: "Convert" },
  { id: "calc", fa: "محاسبات", en: "Calculations" },
  { id: "bulk", fa: "تبدیل انبوه", en: "Bulk" },
];

export function Tool() {
  const { lang } = useI18n();
  const copy = toolsCopy[lang];
  const { tier } = useTier();
  const [state, setState] = useUrlState(
    useCallback((params: URLSearchParams) => {
      const tab = (params.get("tab") as Tab) ?? "convert";
      return {
        tab: (["convert", "calc", "bulk"] as Tab[]).includes(tab) ? tab : "convert",
        direction: (params.get("dir") as Direction) ?? "to-gregorian",
        value: params.get("d") ?? "1404/07/01",
        second: params.get("b") ?? "1404/08/15",
        addDays: params.get("add") ?? "15",
      };
    }, []),
    useCallback((next: { tab: Tab; direction: Direction; value: string; second: string; addDays: string }) => {
      const params = new URLSearchParams({ tab: next.tab, dir: next.direction, d: next.value, b: next.second, add: next.addDays });
      return params;
    }, []),
  );

  const debouncedValue = useDebounced(state.value, tier === "low-power" ? 380 : 140);
  const result = useMemo(
    () => (state.direction === "to-gregorian" ? convertJalali(debouncedValue) : convertGregorian(debouncedValue)),
    [debouncedValue, state.direction],
  );
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (tier === "low-power" || !result.ok) return;
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 260);
    return () => clearTimeout(timer);
  }, [result, tier]);

  const share = useShareLink("jalali");
  const jalaliText = result.ok ? `${result.jalali.year}/${String(result.jalali.month).padStart(2, "0")}/${String(result.jalali.day).padStart(2, "0")}` : "—";
  const gregorianText = result.ok ? formatGregorian(result.gregorian) : "—";
  const summary = result.ok ? `${debouncedValue} → ${state.direction === "to-gregorian" ? gregorianText : jalaliText}` : "—";

  useEffect(() => {
    if (result.ok) trackToolUse("jalali", lang, true);
  }, [result.ok, lang]);

  return (
    <div>
      <div role="tablist" aria-label={lang === "fa" ? "بخش‌های ابزار" : "Tool sections"} className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={state.tab === tab.id}
            onClick={() => setState({ ...state, tab: tab.id })}
            className={`rounded-xl border px-4 py-2 text-sm ${state.tab === tab.id ? "border-[var(--bright)]/60 bg-[var(--bright)]/10 text-white" : "border-[var(--line)] text-white/60 hover:text-white"}`}
          >
            {lang === "fa" ? tab.fa : tab.en}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {state.tab === "convert" ? (
          <ConvertPanel
            direction={state.direction}
            value={state.value}
            result={result}
            pulse={pulse && tier === "full"}
            onChange={(next) => setState({ ...state, ...next })}
          />
        ) : null}
        {state.tab === "calc" ? (
          <CalcPanel
            first={state.value}
            second={state.second}
            addDays={Number(state.addDays) || 0}
            onChange={(next) => setState({ ...state, ...next })}
          />
        ) : null}
        {state.tab === "bulk" ? <BulkPanel /> : null}
      </div>

      <div className="mt-6">
        <ShareBar
          state={share.state}
          summaryText={summary}
          canShare={result.ok}
          onCreate={() =>
            void share.create(
              {
                summaryFa: `تبدیل تاریخ: ${debouncedValue} → ${state.direction === "to-gregorian" ? gregorianText : jalaliText}`,
                summaryEn: `Date conversion: ${debouncedValue} → ${state.direction === "to-gregorian" ? gregorianText : jalaliText}`,
                params: { tool: "jalali", tab: state.tab, dir: state.direction, d: state.value },
              },
              lang,
            )
          }
        />
      </div>
      <p className="mt-3 text-xs text-white/55">{copy.tool.resultNoindex}</p>
    </div>
  );
}

function ConvertPanel({
  direction,
  value,
  result,
  pulse,
  onChange,
}: {
  direction: Direction;
  value: string;
  result: ReturnType<typeof convertJalali>;
  pulse: boolean;
  onChange: (next: Partial<{ direction: Direction; value: string }>) => void;
}) {
  const { lang } = useI18n();
  const today = useMemo(() => {
    const now = jalaliToday();
    return convertJalali(`${now.year}/${now.month}/${now.day}`);
  }, []);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["to-gregorian", "to-jalali"] as Direction[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange({ direction: option })}
            aria-pressed={direction === option}
            className={`rounded-xl border px-3 py-2 text-xs ${direction === option ? "border-[var(--bright)]/60 text-white" : "border-[var(--line)] text-white/50 hover:text-white"}`}
          >
            {option === "to-gregorian" ? (lang === "fa" ? "شمسی → میلادی" : "Jalali → Gregorian") : lang === "fa" ? "میلادی → شمسی" : "Gregorian → Jalali"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            if (today.ok) onChange({ value: formatGregorian(today.gregorian) });
          }}
          className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] px-3 py-2 text-xs text-white/60 hover:text-white"
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {lang === "fa" ? "امروز" : "Today"}
        </button>
      </div>

      <label className="block">
        <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "تاریخ" : "Date"}</span>
        <input
          value={value}
          onChange={(event) => onChange({ value: event.target.value })}
          inputMode="numeric"
          dir="ltr"
          aria-describedby="jalali-help"
          className="w-full rounded-2xl border border-[var(--line)] bg-black/30 px-4 py-3 text-lg tracking-wide outline-none focus:border-[var(--bright)]/60"
          placeholder={direction === "to-gregorian" ? "1404/07/01" : "2025-03-21"}
        />
      </label>
      <p id="jalali-help" className="text-xs text-white/55">
        {lang === "fa" ? "ارقام فارسی، عربی یا لاتین؛ جداکننده / یا -" : "Persian, Arabic or Latin digits; / or - separators"}
      </p>

      {result.ok ? (
        <dl className={`grid gap-3 sm:grid-cols-2 ${pulse ? "jalali-pulse" : ""}`}>
          <Readout label={lang === "fa" ? "شمسی" : "Jalali"} value={`${toPersianDigits(`${result.jalali.year}/${String(result.jalali.month).padStart(2, "0")}/${String(result.jalali.day).padStart(2, "0")}`)}`} />
          <Readout label={lang === "fa" ? "میلادی" : "Gregorian"} value={formatGregorian(result.gregorian)} />
          <Readout label={lang === "fa" ? "روز هفته" : "Weekday"} value={result.weekdayFa} />
          <Readout label={lang === "fa" ? "روز سال" : "Day of year"} value={toPersianDigits(result.dayOfYear)} />
          <Readout label={lang === "fa" ? "سال کبیسه" : "Leap year"} value={result.leapYear ? (lang === "fa" ? "بله" : "Yes") : lang === "fa" ? "خیر" : "No"} />
          <Readout label={lang === "fa" ? "قالب بلند" : "Long form"} value={result.longFa} />
        </dl>
      ) : (
        <p role="alert" className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">
          {lang === "fa" ? result.messageFa : result.messageEn}
        </p>
      )}
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-black/20 p-4">
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className="mt-1 font-mono text-lg" dir="auto">
        {value}
      </dd>
    </div>
  );
}

function CalcPanel({ first, second, addDays, onChange }: { first: string; second: string; addDays: number; onChange: (next: Partial<{ value: string; second: string; addDays: string }>) => void }) {
  const { lang } = useI18n();
  const a = convertJalali(first);
  const b = convertJalali(second);
  const [holidays, setHolidays] = useState<{ map: HolidayMap; version: string | null; year: number | null; loaded: boolean; error: boolean }>({ map: {}, version: null, year: null, loaded: false, error: false });
  const [plan, setPlan] = useState<WorkdayPlan | null>(null);

  const year = a.ok ? a.jalali.year : null;
  useEffect(() => {
    if (!year) return;
    let cancelled = false;
    apiGet<{ year: number; version: string; items: { date: string; label: string }[] }>(`/tools/jalali/holidays/?year=${year}`)
      .then((response) => {
        if (cancelled) return;
        const map: HolidayMap = {};
        for (const item of response.items) map[item.date] = item.label;
        setHolidays({ map, version: response.version, year: response.year, loaded: true, error: false });
      })
      .catch(() => {
        if (!cancelled) setHolidays({ map: {}, version: null, year, loaded: true, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const diff = a.ok && b.ok ? diffDates(a.jalali, b.jalali, holidays.map) : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "تاریخ اول" : "First date"}</span>
          <input value={first} onChange={(event) => onChange({ value: event.target.value })} dir="ltr" className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 outline-none focus:border-[var(--bright)]/60" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "تاریخ دوم" : "Second date"}</span>
          <input value={second} onChange={(event) => onChange({ second: event.target.value })} dir="ltr" className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 outline-none focus:border-[var(--bright)]/60" />
        </label>
      </div>

      {diff ? (
        <dl className="grid gap-3 sm:grid-cols-4">
          <Readout label={lang === "fa" ? "اختلاف روز" : "Days"} value={toPersianDigits(diff.days)} />
          <Readout label={lang === "fa" ? "تفکیک" : "Breakdown"} value={toPersianDigits(`${diff.breakdown.years} س / ${diff.breakdown.months} م / ${diff.breakdown.days} ر`)} />
          <Readout label={lang === "fa" ? "روز کاری" : "Business days"} value={toPersianDigits(diff.workingDaysExclusive)} />
          <Readout label={lang === "fa" ? "جمعه‌ها" : "Fridays"} value={toPersianDigits(diff.weekendDays)} />
        </dl>
      ) : (
        <p role="alert" className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">
          {lang === "fa" ? "برای محاسبه، دو تاریخ معتبر وارد کنید." : "Enter two valid dates to calculate."}
        </p>
      )}

      <div className="rounded-2xl border border-[var(--line)] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "افزودن روز کاری" : "Add business days"}</span>
            <input type="number" min={0} max={400} value={addDays} onChange={(event) => onChange({ addDays: event.target.value })} className="w-32 rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 outline-none focus:border-[var(--bright)]/60" />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!a.ok) return;
              try {
                setPlan(addWorkingDays(a.jalali, addDays, holidays.map));
              } catch {
                setPlan(null);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--bright)]/50 px-4 py-2 text-sm text-[var(--bright)]"
          >
            {holidays.loaded && holidays.error ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {lang === "fa" ? "محاسبهٔ روز کاری" : "Calculate"}
          </button>
        </div>
        <p className="mt-3 text-xs text-white/55">
          {!holidays.loaded
            ? lang === "fa"
              ? "در حال خواندن تقویم تعطیلات…"
              : "Loading the holiday calendar…"
            : holidays.error
              ? lang === "fa"
                ? "تقویم تعطیلات از سرویس خوانده نشد؛ فعلاً فقط جمعه‌ها در نظر گرفته می‌شود."
                : "The holiday calendar could not be loaded; only Fridays are skipped for now."
              : holidays.map && Object.keys(holidays.map).length
                ? lang === "fa"
                  ? `تقویم نسخهٔ ${holidays.version} برای سال ${toPersianDigits(year ?? "")} اعمال شد.`
                  : `Holiday calendar ${holidays.version} for ${year} applied.`
                : lang === "fa"
                  ? "برای این سال تقویم تعطیلات رسمی ثبت نشده است؛ فقط جمعه‌ها در نظر گرفته می‌شود."
                  : "No official holiday calendar is loaded for this year; only Fridays are skipped."}
        </p>
        {plan ? (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-black/20 p-4 text-sm">
            <p className="font-mono" dir="auto">
              {toPersianDigits(`${plan.result.year}/${String(plan.result.month).padStart(2, "0")}/${String(plan.result.day).padStart(2, "0")}`)} — {plan.resultLongFa}
            </p>
            <p className="mt-2 text-xs text-white/50">
              {lang === "fa"
                ? `جمعه‌های رد‌شده: ${toPersianDigits(plan.skippedWeekends)} · تعطیلات رسمی رد‌شده: ${toPersianDigits(plan.skippedHolidays)}`
                : `Skipped Fridays: ${plan.skippedWeekends} · skipped holidays: ${plan.skippedHolidays}`}
            </p>
            {plan.holidayLabels.length ? (
              <ul className="mt-2 list-disc space-y-1 ps-5 text-xs text-white/55">
                {plan.holidayLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Readout label={lang === "fa" ? "تا نوروز" : "To Nowruz"} value={a.ok ? `${toPersianDigits(distanceToAnnual(a.jalali, NOROOZ).days)} روز` : "—"} />
        <Readout label={lang === "fa" ? "تا شب یلدا" : "To Yalda"} value={a.ok ? `${toPersianDigits(distanceToAnnual(a.jalali, YALDA).days)} روز` : "—"} />
        <Readout
          label={lang === "fa" ? "اولین جمعهٔ ماه اول" : "First Friday of month"}
          value={a.ok ? (nthWeekdayOfMonth(a.jalali.year, a.jalali.month, 6, 1) ? toPersianDigits(formatGregorian({ year: a.jalali.year, month: a.jalali.month, day: 1 })) : "—") : "—"}
        />
      </div>
    </div>
  );
}

function BulkPanel() {
  const { lang } = useI18n();
  const [text, setText] = useState("۱۴۰۴/۰۱/۰۱\n1404/07/01\n2025-03-20");
  const [direction, setDirection] = useState<"jalali-to-gregorian" | "gregorian-to-jalali">("jalali-to-gregorian");
  const result = useMemo(() => convertBulk(text, direction), [text, direction]);
  const csv = useMemo(() => bulkToCsv(result), [result]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(["jalali-to-gregorian", "gregorian-to-jalali"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={direction === option}
            onClick={() => setDirection(option)}
            className={`rounded-xl border px-3 py-2 ${direction === option ? "border-[var(--bright)]/60 text-white" : "border-[var(--line)] text-white/50 hover:text-white"}`}
          >
            {option === "jalali-to-gregorian" ? (lang === "fa" ? "شمسی → میلادی" : "Jalali → Gregorian") : lang === "fa" ? "میلادی → شمسی" : "Gregorian → Jalali"}
          </button>
        ))}
        <span className="text-white/55">
          {lang === "fa" ? `حداکثر ${toPersianDigits(BULK_MAX_LINES)} خط` : `Up to ${BULK_MAX_LINES} lines`}
        </span>
      </div>
      <label className="block">
        <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "هر خط یک تاریخ" : "One date per line"}</span>
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={6} dir="ltr" className="w-full rounded-2xl border border-[var(--line)] bg-black/30 p-3 font-mono text-sm outline-none focus:border-[var(--bright)]/60" />
      </label>
      <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
        <span>
          {lang === "fa" ? `موفق: ${toPersianDigits(result.okCount)}` : `Converted: ${result.okCount}`} · {lang === "fa" ? `خطا: ${toPersianDigits(result.errorCount)}` : `Errors: ${result.errorCount}`}
          {result.truncated ? (lang === "fa" ? " · ورودی به ۱۰۰۰ خط محدود شد" : " · input truncated to 1000 lines") : ""}
        </span>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent("\ufeff" + csv)}`}
          download="emmett-jalali-bulk.csv"
          className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] px-3 py-1.5 hover:text-white"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          CSV
        </a>
      </div>
      <div className="overflow-auto rounded-2xl border border-[var(--line)]">
        <table className="w-full min-w-[520px] text-start text-sm">
          <thead className="bg-white/5 text-xs text-white/50">
            <tr>
              <th className="p-3 text-start">{lang === "fa" ? "ورودی" : "Input"}</th>
              <th className="p-3 text-start">{lang === "fa" ? "شمسی" : "Jalali"}</th>
              <th className="p-3 text-start">{lang === "fa" ? "میلادی" : "Gregorian"}</th>
              <th className="p-3 text-start">{lang === "fa" ? "روز" : "Weekday"}</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.slice(0, 50).map((row, index) => (
              <tr key={`${row.input}-${index}`} className="border-t border-[var(--line)]">
                <td className="p-3 font-mono" dir="ltr">
                  {row.input}
                </td>
                {row.ok ? (
                  <>
                    <td className="p-3 font-mono">{row.jalali}</td>
                    <td className="p-3 font-mono">{row.gregorian}</td>
                    <td className="p-3">{row.weekday}</td>
                  </>
                ) : (
                  <td className="p-3 text-amber-300" colSpan={3}>
                    {row.errorFa}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
