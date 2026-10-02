/** Small, dependency-free building blocks shared by the four F-09 tabs. */
import type { ReactNode } from "react";
import { useState } from "react";
import type { CodonUsageRow, GcWindow, Orf } from "../logic";
import { biolabCopy } from "../copy";
import { useCopyToClipboard } from "@/features/toolbox/hooks";

const number = (value: number, digits = 0) =>
  value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-black/20 p-3">
      <p className="text-[11px] uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1 font-mono text-lg text-white/90">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-white/45">{hint}</p> : null}
    </div>
  );
}

export function OrfTable({ orfs, lang, limit = 12 }: { orfs: Orf[]; lang: "fa" | "en"; limit?: number }) {
  const copy = biolabCopy[lang].results;
  if (!orfs.length) return <p className="text-sm text-white/55">{copy.orfNone}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{copy.orfTitle}</caption>
        <thead>
          <tr className="text-start text-xs text-white/50">
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.orfColumns.coordinates}</th>
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.orfColumns.frame}</th>
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.orfColumns.strand}</th>
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.orfColumns.aa}</th>
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.orfColumns.complete}</th>
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.orfColumns.protein}</th>
          </tr>
        </thead>
        <tbody>
          {orfs.slice(0, limit).map((orf) => (
            <tr key={`${orf.strand}-${orf.frame}-${orf.start}`}>
              <td className="border-b border-[var(--line)] px-2 py-2 font-mono text-xs text-white/80">
                {number(orf.start)}–{number(orf.end)}
              </td>
              <td className="border-b border-[var(--line)] px-2 py-2 font-mono text-xs text-white/70">{orf.frame}</td>
              <td className="border-b border-[var(--line)] px-2 py-2 text-xs text-white/70">
                {orf.strand === "forward" ? copy.forward : copy.reverse}
              </td>
              <td className="border-b border-[var(--line)] px-2 py-2 font-mono text-xs text-white/70">{number(orf.lengthAa)}</td>
              <td className="border-b border-[var(--line)] px-2 py-2 text-xs text-white/70">
                {orf.complete ? copy.complete : copy.partial}
              </td>
              <td className="border-b border-[var(--line)] px-2 py-2 font-mono text-[11px] text-white/60">
                {orf.protein.slice(0, 28)}
                {orf.protein.length > 28 ? "…" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RegionsTable({ regions, lang, limit = 8 }: { regions: GcWindow[]; lang: "fa" | "en"; limit?: number }) {
  const copy = biolabCopy[lang].results;
  if (!regions.length) return <p className="text-sm text-white/55">{copy.regionsNone}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse text-sm">
        <caption className="sr-only">{copy.regionsTitle}</caption>
        <thead>
          <tr className="text-xs text-white/50">
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.regionColumns.start}</th>
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.regionColumns.end}</th>
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.regionColumns.gc}</th>
          </tr>
        </thead>
        <tbody>
          {regions.slice(0, limit).map((region) => (
            <tr key={`${region.start}-${region.end}`}>
              <td className="border-b border-[var(--line)] px-2 py-2 font-mono text-xs text-white/80">{number(region.start + 1)}</td>
              <td className="border-b border-[var(--line)] px-2 py-2 font-mono text-xs text-white/80">{number(region.end)}</td>
              <td className="border-b border-[var(--line)] px-2 py-2 font-mono text-xs text-white/70">{region.gc.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CodonTable({ rows, lang, limit = 10 }: { rows: CodonUsageRow[]; lang: "fa" | "en"; limit?: number }) {
  const copy = biolabCopy[lang].results;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse text-sm">
        <caption className="sr-only">{copy.codonTitle}</caption>
        <thead>
          <tr className="text-xs text-white/50">
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.codonColumns.codon}</th>
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.codonColumns.amino}</th>
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.codonColumns.count}</th>
            <th scope="col" className="border-b border-[var(--line)] px-2 py-2 text-start">{copy.codonColumns.perThousand}</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, limit).map((row) => (
            <tr key={row.codon}>
              <td className="border-b border-[var(--line)] px-2 py-2 font-mono text-xs text-white/85">{row.codon}</td>
              <td className="border-b border-[var(--line)] px-2 py-2 font-mono text-xs text-white/70">{row.amino}</td>
              <td className="border-b border-[var(--line)] px-2 py-2 font-mono text-xs text-white/70">{number(row.count)}</td>
              <td className="border-b border-[var(--line)] px-2 py-2 font-mono text-xs text-white/70">{row.perThousand.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <button
      type="button"
      onClick={() => void copy(text, "field")}
      className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs text-white/70 hover:text-white"
    >
      {copied === "field" ? copiedLabel : label}
    </button>
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  mono = true,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  mono?: boolean;
  ariaLabel?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full rounded-2xl border border-[var(--line)] bg-black/30 p-3 text-sm leading-6 text-white/85 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--bright)] ${mono ? "font-mono text-[12.5px]" : ""}`}
    />
  );
}

export function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-white/60">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-white/70">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[var(--bright)]" />
      {label}
    </label>
  );
}

export function Disclosure({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-black/20">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-sm text-white/80">
        {title}
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="border-t border-[var(--line)] px-4 py-3">{children}</div> : null}
    </div>
  );
}
