import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Info, ShieldAlert, ShieldCheck } from "lucide-react";
import { useI18n } from "@/app/i18n";
import { SEVERITY_LABELS, decodeJwt, type JwtSeverity, type JwtWarning } from "./logic";
import { trackToolUse, useDebounced } from "../hooks";

const SAMPLE =
  "eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleS0xIn0.eyJzdWIiOiIxMjMiLCJpc3MiOiJlbW1ldHQiLCJhdWQiOiJlbW1ldHQuY29tIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwMDM2MDB9.c2lnbmF0dXJl";

export function Tool() {
  const { lang } = useI18n();
  const [value, setValue] = useState(SAMPLE);
  const debounced = useDebounced(value, 200);
  const analysis = useMemo(() => decodeJwt(debounced), [debounced]);

  useEffect(() => {
    if (analysis.ok) trackToolUse("jwt", lang, true);
  }, [analysis.ok, lang]);

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="mb-2 block text-xs text-white/50">{lang === "fa" ? "توکن JWT (فقط در همین مرورگر پردازش می‌شود)" : "JWT (processed in this browser only)"}</span>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={4}
          dir="ltr"
          spellCheck={false}
          className="w-full rounded-2xl border border-[var(--line)] bg-black/30 p-4 font-mono text-xs leading-6 outline-none focus:border-[var(--bright)]/60"
          aria-describedby="jwt-help"
        />
      </label>
      <p id="jwt-help" className="flex items-center gap-2 text-xs text-white/55">
        <ShieldCheck className="h-3.5 w-3.5 text-[var(--bright)]" aria-hidden />
        {lang === "fa" ? "هیچ درخواست شبکه‌ای برای decode زده نمی‌شود و لینک اشتراک ساخته نمی‌شود." : "No network request is made to decode, and no share link is created."}
      </p>

      {!analysis.ok ? (
        <p role="alert" className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">
          {lang === "fa" ? analysis.messageFa : analysis.messageEn}
        </p>
      ) : (
        <>
          <p className="rounded-2xl border border-[var(--line)] bg-black/20 p-4 text-sm text-white/70">
            {lang === "fa" ? analysis.summaryFa : "Decoded. Decode ≠ verified: the signature was not checked."}
          </p>

          <WarningPanel warnings={analysis.warnings} />

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Header" json={analysis.header} />
            <Panel title="Payload" json={analysis.payload} />
            <Panel title="Signature" text={analysis.signaturePresent ? (lang === "fa" ? "امضا وجود دارد (بررسی نشده)" : "Signature present (not verified)") : lang === "fa" ? "امضایی وجود ندارد" : "No signature"} />
          </div>

          {analysis.timing.exp || analysis.timing.iat || analysis.timing.nbf ? (
            <dl className="grid gap-3 sm:grid-cols-3">
              {(["iat", "nbf", "exp"] as const).map((key) =>
                analysis.timing[key] ? (
                  <div key={key} className="rounded-2xl border border-[var(--line)] bg-black/20 p-4">
                    <dt className="text-xs text-white/55">{key.toUpperCase()}</dt>
                    <dd className="mt-1 text-sm">{analysis.timing[key]?.jalali}</dd>
                    <dd className="text-xs text-white/55">{analysis.timing[key]?.relativeFa}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          ) : null}
        </>
      )}
    </div>
  );
}

function WarningPanel({ warnings }: { warnings: JwtWarning[] }) {
  const { lang } = useI18n();
  if (!warnings.length) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-[var(--bright)]/30 bg-[var(--bright)]/5 p-4 text-sm text-[var(--bright)]">
        <ShieldCheck className="h-4 w-4" aria-hidden />
        {lang === "fa" ? "هشدار امنیتی شناخته‌شده‌ای در هدر و payload پیدا نشد." : "No known header/payload warning was found."}
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {warnings.map((warning) => (
        <li key={warning.id} className="rounded-2xl border border-[var(--line)] bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityIcon severity={warning.severity} />
            <b className="text-sm">{lang === "fa" ? warning.titleFa : warning.titleEn}</b>
            <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-white/50" dir="ltr">
              {warning.cwe}
            </span>
            <span className="text-[11px]" style={{ color: SEVERITY_LABELS[warning.severity].color }}>
              {SEVERITY_LABELS[warning.severity][lang]}
            </span>
          </div>
          <p className="mt-2 text-xs leading-6 text-white/55">{lang === "fa" ? warning.detailFa : warning.detailEn}</p>
        </li>
      ))}
    </ul>
  );
}

function SeverityIcon({ severity }: { severity: JwtSeverity }) {
  if (severity === "critical") return <ShieldAlert className="h-4 w-4 text-[var(--color-capability-security)]" aria-hidden />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden />;
  return <Info className="h-4 w-4 text-white/55" aria-hidden />;
}

function Panel({ title, json, text }: { title: string; json?: Record<string, unknown>; text?: string }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-black/20 p-4">
      <h2 className="text-xs text-white/50">{title}</h2>
      {json ? (
        <pre dir="ltr" className="mt-3 max-h-72 overflow-auto text-left text-[12px] leading-6 text-white/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--bright)]" tabIndex={0}>
          <code>{JSON.stringify(json, null, 2)}</code>
        </pre>
      ) : (
        <p className="mt-3 text-xs text-white/55">{text}</p>
      )}
    </section>
  );
}
