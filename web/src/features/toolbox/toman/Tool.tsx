import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useI18n } from "@/app/i18n";
import { toPersianDigits } from "@/lib/jalali";
import { trackToolUse, useShareLink, useUrlState, useDebounced } from "../hooks";
import { ShareBar } from "../ui/ShareBar";
import {
  formatTomanFa,
  formalInvoiceLine,
  groupLatin,
  invoiceBreakdown,
  parseAmount,
  rialToToman,
  tomanToWords,
} from "./logic";

export function Tool() {
  const { lang } = useI18n();
  const [state, setState] = useUrlState(
    useMemo(
      () => (params: URLSearchParams) => ({
        amount: params.get("v") ?? "1250000",
        vat: params.get("vat") ?? "10",
        discount: params.get("off") ?? "0",
        // digits follow the page language unless the URL pins them
        digits: params.get("digits") ?? lang,
        rial: params.get("rial") ?? "",
      }),
      [],
    ),
    useMemo(
      () => (next: { amount: string; vat: string; discount: string; digits: string; rial: string }) =>
        new URLSearchParams({ v: next.amount, vat: next.vat, off: next.discount, digits: next.digits, rial: next.rial }),
      [],
    ),
  );
  const debouncedAmount = useDebounced(state.amount, 160);
  const parsed = useMemo(() => parseAmount(debouncedAmount), [debouncedAmount]);
  const amount = parsed.ok ? parsed.toman : 0n;
  const share = useShareLink("toman");
  const [showDigits, setShowDigits] = useState(state.digits === "fa");
  const digit = (value: string) => (showDigits ? toPersianDigits(value) : value);

  const reverse = useMemo(() => {
    const parsedRial = parseAmount(state.rial);
    return parsedRial.ok ? rialToToman(parsedRial.toman) : null;
  }, [state.rial]);

  const invoice = useMemo(() => {
    try {
      return invoiceBreakdown(amount, parseAmount(state.discount).ok ? (parseAmount(state.discount) as { ok: true; toman: bigint }).toman : 0n, Number(state.vat) || 0);
    } catch {
      return null;
    }
  }, [amount, state.discount, state.vat]);

  useEffect(() => {
    if (parsed.ok) trackToolUse("toman", lang, true);
  }, [parsed.ok, lang]);

  const summary = parsed.ok ? `${formatTomanFa(amount)} — ${tomanToWords(amount)}` : "—";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="block">
          <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "مبلغ به تومان" : "Amount in toman"}</span>
          <input
            value={state.amount}
            onChange={(event) => setState({ ...state, amount: event.target.value })}
            inputMode="numeric"
            dir="ltr"
            className="w-full rounded-2xl border border-[var(--line)] bg-black/30 px-4 py-4 text-2xl tracking-wide outline-none focus:border-[var(--bright)]/60"
            aria-describedby="toman-help"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowDigits((value) => !value)}
          className="rounded-xl border border-[var(--line)] px-4 py-3 text-xs text-white/60 hover:text-white"
          aria-pressed={showDigits}
        >
          {showDigits ? (lang === "fa" ? "ارقام: فارسی" : "Digits: Persian") : lang === "fa" ? "ارقام: لاتین" : "Digits: Latin"}
        </button>
      </div>
      <p id="toman-help" className="text-xs text-white/55">
        {lang === "fa" ? "مثال: ۱٬۲۵۰٬۰۰۰ یا 1250000 — ورودی اعشاری پذیرفته نمی‌شود." : "Example: 1,250,000 or 1250000 — decimals are rejected."}
      </p>

      {!parsed.ok ? (
        <p role="alert" className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">
          {lang === "fa" ? parsed.messageFa : parsed.messageEn}
        </p>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2">
          <Output label={lang === "fa" ? "تومان" : "Toman"} value={digit(groupLatin(amount))} suffix={lang === "fa" ? "تومان" : "toman"} />
          <Output label={lang === "fa" ? "ریال" : "Rial"} value={digit(groupLatin(amount * 10n))} suffix={lang === "fa" ? "ریال" : "rial"} />
          <Output label={lang === "fa" ? "حروف‌نویسی چک" : "Cheque wording"} value={tomanToWords(amount)} wide />
          <Output label={lang === "fa" ? "شکل رسمی فاکتور" : "Formal invoice line"} value={formalInvoiceLine(amount)} wide />
        </dl>
      )}

      <section aria-labelledby="invoice-calc" className="rounded-2xl border border-[var(--line)] p-5">
        <h2 id="invoice-calc" className="text-sm font-semibold">
          {lang === "fa" ? "ماشین‌حساب فاکتور" : "Invoice calculator"}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "تخفیف (تومان)" : "Discount (toman)"}</span>
            <input value={state.discount} onChange={(event) => setState({ ...state, discount: event.target.value })} dir="ltr" className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 outline-none focus:border-[var(--bright)]/60" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "مالیات بر ارزش افزوده (٪)" : "VAT (%)"}</span>
            <input value={state.vat} onChange={(event) => setState({ ...state, vat: event.target.value })} dir="ltr" className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 outline-none focus:border-[var(--bright)]/60" />
          </label>
        </div>
        {invoice ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <Output label={lang === "fa" ? "مبلغ مشمول" : "Taxable"} value={digit(groupLatin(invoice.taxable))} suffix={lang === "fa" ? "تومان" : "toman"} />
            <Output label={lang === "fa" ? "مالیات" : "VAT"} value={digit(groupLatin(invoice.vat))} suffix={lang === "fa" ? "تومان" : "toman"} />
            <Output label={lang === "fa" ? "جمع کل" : "Total"} value={digit(groupLatin(invoice.total))} suffix={lang === "fa" ? "تومان" : "toman"} />
          </dl>
        ) : (
          <p role="alert" className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200">
            {lang === "fa" ? "تخفیف یا درصد مالیات نامعتبر است." : "Discount or VAT rate is invalid."}
          </p>
        )}
      </section>

      <section aria-labelledby="reverse" className="rounded-2xl border border-[var(--line)] p-5">
        <h2 id="reverse" className="flex items-center gap-2 text-sm font-semibold">
          <ArrowLeftRight className="h-4 w-4" aria-hidden />
          {lang === "fa" ? "تبدیل معکوس: ریال → تومان" : "Reverse: rial → toman"}
        </h2>
        <label className="mt-4 block">
          <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "مبلغ به ریال" : "Amount in rial"}</span>
          <input value={state.rial} onChange={(event) => setState({ ...state, rial: event.target.value })} dir="ltr" placeholder="12500000" className="w-full rounded-xl border border-[var(--line)] bg-black/30 px-3 py-2 outline-none focus:border-[var(--bright)]/60" />
        </label>
        {reverse ? (
          <p className="mt-3 text-sm">
            <span className="font-mono" dir="auto">{digit(groupLatin(reverse.toman))} {lang === "fa" ? "تومان" : "toman"}</span>
            {reverse.rounded ? <span className="ms-2 text-xs text-amber-300">{lang === "fa" ? "(با گردکردن به تومان صحیح)" : "(rounded to whole toman)"}</span> : null}
          </p>
        ) : (
          <p className="mt-3 text-xs text-white/55">{lang === "fa" ? "برای تبدیل، مبلغ ریال را وارد کنید." : "Enter a rial amount to convert."}</p>
        )}
      </section>

      <ShareBar
        state={share.state}
        summaryText={summary}
        canShare={parsed.ok}
        onCreate={() =>
          void share.create(
            {
              summaryFa: `${formatTomanFa(amount)} — ${tomanToWords(amount)}`,
              summaryEn: `${formatTomanFa(amount)}`,
              params: { tool: "toman", v: state.amount, vat: state.vat, off: state.discount },
            },
            lang,
          )
        }
      />
    </div>
  );
}

function Output({ label, value, suffix, wide }: { label: string; value: string; suffix?: string; wide?: boolean }) {
  return (
    <div className={`rounded-2xl border border-[var(--line)] bg-black/20 p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs text-white/55">{label}</dt>
      <dd className="mt-1 font-mono text-lg" dir="auto">
        {value}
        {suffix ? <span className="ms-2 text-xs text-white/55">{suffix}</span> : null}
      </dd>
    </div>
  );
}
