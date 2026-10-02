import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { useI18n } from "@/app/i18n";
import { toPersianDigits } from "@/lib/jalali";
import { useDebounced, useShareLink, trackToolUse } from "../hooks";
import { ShareBar } from "../ui/ShareBar";
import { DEFAULT_SAMPLE, validateNationalId } from "./logic";

export function Tool() {
  const { lang } = useI18n();
  const [value, setValue] = useState(DEFAULT_SAMPLE);
  const debounced = useDebounced(value, 180);
  const result = useMemo(() => validateNationalId(debounced), [debounced]);
  const share = useShareLink("kod-meli");

  useEffect(() => {
    if (result.valid) trackToolUse("kod-meli", lang, true);
  }, [result.valid, lang]);

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "کد ملی (۱۰ رقم) یا شناسهٔ ملی (۱۱ رقم)" : "National ID (10 digits) or legal-entity ID (11 digits)"}</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          inputMode="numeric"
          dir="ltr"
          className="w-full rounded-2xl border border-[var(--line)] bg-black/30 px-4 py-4 text-center text-2xl tracking-[0.35em] outline-none focus:border-[var(--bright)]/60"
          aria-describedby="kod-meli-help"
          placeholder="0499370899"
        />
      </label>
      <p id="kod-meli-help" className="text-xs text-white/55">
        {lang === "fa" ? "ورودی شما به هیچ سروری فرستاده نمی‌شود؛ ارقام فارسی و عربی هم پذیرفته می‌شود." : "Your input never leaves the browser; Persian and Arabic digits are accepted."}
      </p>

      <ResultBanner result={result} />

      {result.steps.length ? (
        <ol className="space-y-2">
          {result.steps.map((step, index) => (
            <li key={step.labelFa} className={`rounded-2xl border p-4 text-sm ${index === result.steps.length - 1 && !result.valid ? "border-amber-400/40 bg-amber-400/5" : "border-[var(--line)] bg-black/20"}`}>
              <b className="block text-white/80">{lang === "fa" ? step.labelFa : step.labelEn}</b>
              <span className="mt-1 block font-mono text-xs text-white/55" dir="ltr">
                {step.detail}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <ShareBar
        state={share.state}
        summaryText={`${lang === "fa" ? "بررسی کد" : "ID check"}: ${result.kind} — ${result.valid ? (lang === "fa" ? "ساختار معتبر" : "structurally valid") : lang === "fa" ? "نامعتبر" : "invalid"}`}
        canShare={false}
        note={lang === "fa" ? "برای حفاظت از ورودی، این ابزار لینک اشتراک نمی‌سازد." : "To protect your input, this tool does not create share links."}
      />
      <CommonMistakes />
    </div>
  );
}

function ResultBanner({ result }: { result: ReturnType<typeof validateNationalId> }) {
  const { lang } = useI18n();
  if (!result.normalized) {
    return <p className="rounded-2xl border border-[var(--line)] p-4 text-sm text-white/50">{lang === "fa" ? "کدی وارد نشده است." : "No code entered yet."}</p>;
  }
  const kindLabel =
    result.kind === "person" ? (lang === "fa" ? "کد ملی شخص" : "Personal code") : result.kind === "company" ? (lang === "fa" ? "شناسهٔ ملی شخص حقوقی" : "Legal-entity ID") : lang === "fa" ? "نامشخص" : "Unknown";
  return (
    <div
      role="status"
      className={`flex flex-wrap items-start gap-3 rounded-2xl border p-4 ${result.valid ? "border-[var(--bright)]/40 bg-[var(--bright)]/5" : "border-amber-400/30 bg-amber-400/5"}`}
    >
      {result.valid ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--bright)]" aria-hidden /> : <XCircle className="mt-0.5 h-5 w-5 text-amber-300" aria-hidden />}
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{result.valid ? (lang === "fa" ? "ساختار معتبر است" : "Structurally valid") : lang === "fa" ? "ساختار معتبر نیست" : "Structurally invalid"}</p>
        <p className="mt-1 text-white/60">{lang === "fa" ? result.reasonFa : result.reasonEn}</p>
        <p className="mt-2 text-xs text-white/55">
          {kindLabel}
          {result.expectedCheckDigit !== null ? ` · ${lang === "fa" ? "رقم کنترل مورد انتظار" : "expected check digit"}: ${toPersianDigits(result.expectedCheckDigit)}` : ""}
          {result.actualCheckDigit !== null ? ` · ${lang === "fa" ? "رقم آخر" : "actual"}: ${toPersianDigits(result.actualCheckDigit)}` : ""}
        </p>
      </div>
      <ShieldAlert className="h-4 w-4 text-white/55" aria-hidden />
    </div>
  );
}

function CommonMistakes() {
  const { lang } = useI18n();
  const items = lang === "fa"
    ? [
        ["نپذیرفتن صفر ابتدایی", "کدهایی که با صفر شروع می‌شوند با Number به ۹ رقم تبدیل می‌شوند و از فیلتر رد می‌شوند. همیشه رشته را نگه دارید."],
        ["رد نکردن ارقام یکسان", "«۱۱۱۱۱۱۱۱۱۱» از محاسبهٔ ساده عبور می‌کند، ولی از نظر ساختاری نامعتبر است."],
        ["الگوریتم اشتباه برای شناسهٔ شرکت", "شناسهٔ ۱۱ رقمی الگوریتم جداگانه دارد؛ استفاده از الگوریتم کد ملی ده‌رقمی نتیجهٔ غلط می‌دهد."],
      ]
    : [
        ["Dropping leading zeros", "Codes starting with zero collapse to nine digits through Number() and fail validation. Keep them as strings."],
        ["Not rejecting repeated digits", "1111111111 passes a naive checksum but is structurally invalid."],
        ["Wrong algorithm for entity IDs", "The 11-digit legal-entity ID has its own checksum; reusing the 10-digit one gives wrong answers."],
      ];
  return (
    <section aria-labelledby="common-mistakes" className="rounded-2xl border border-[var(--line)] p-5">
      <h2 id="common-mistakes" className="text-sm font-semibold">
        {lang === "fa" ? "سه اشتباه رایج در پیاده‌سازی‌های عمومی" : "Three common bugs in public implementations"}
      </h2>
      <dl className="mt-3 space-y-3 text-xs leading-6">
        {items.map(([title, body]) => (
          <div key={title}>
            <dt className="font-semibold text-white/70">{title}</dt>
            <dd className="text-white/50">{body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
