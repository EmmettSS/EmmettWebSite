/**
 * Low-power viewer mode (§2.2): the same numbers the canvas draws, as a real table.
 *
 * This is not a degraded afterthought — it is the accessible, printable representation of the
 * GC track and the ORF map, and it is what `low-power` devices render instead of any canvas.
 */
import { useMemo } from "react";
import type { GcWindow, Orf } from "../logic";
import { biolabCopy } from "../copy";

const BUCKETS = 12;

export function SequenceTable({
  sequenceLength,
  track,
  orfs,
  regions,
  lang,
}: {
  sequenceLength: number;
  track: number[];
  orfs: Orf[];
  regions: GcWindow[];
  lang: "fa" | "en";
}) {
  const copy = biolabCopy[lang];
  const rows = useMemo(() => summarise(track, sequenceLength, BUCKETS), [track, sequenceLength]);
  const forward = orfs.filter((orf) => orf.strand === "forward").slice(0, 6);
  const reverse = orfs.filter((orf) => orf.strand === "reverse").slice(0, 6);

  return (
    <div className="space-y-4" data-testid="sequence-table">
      <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
        <table className="w-full text-start text-[11px] text-white/75">
          <caption className="p-3 text-start text-xs text-white/60">{copy.results.tableCaption}</caption>
          <thead className="bg-white/5 text-white/55">
            <tr>
              <th scope="col" className="px-3 py-2 text-start font-medium">
                {copy.results.tableRange}
              </th>
              <th scope="col" className="px-3 py-2 text-start font-medium">
                {copy.results.tableGc}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.start}-${row.end}`} className="border-t border-[var(--line)]">
                <td className="px-3 py-1.5 font-mono" dir="ltr">
                  {row.start.toLocaleString("en-US")}–{row.end.toLocaleString("en-US")}
                </td>
                <td className="px-3 py-1.5">{row.gc.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <OrfSummary title={copy.results.tableForward} rows={forward} lang={lang} dirLabel="+" />
        <OrfSummary title={copy.results.tableReverse} rows={reverse} lang={lang} dirLabel="−" />
      </div>

      <p className="text-[11px] text-white/50">
        {copy.results.tableRegions}: {regions.length ? regions.map((region) => `${region.start.toLocaleString("en-US")}–${region.end.toLocaleString("en-US")}`).join(" · ") : copy.results.regionsNone}
      </p>
    </div>
  );
}

function OrfSummary({ title, rows, lang, dirLabel }: { title: string; rows: Orf[]; lang: "fa" | "en"; dirLabel: string }) {
  const copy = biolabCopy[lang];
  return (
    <div className="rounded-2xl border border-[var(--line)] p-3">
      <h4 className="mb-2 text-xs font-semibold text-white/70">{title}</h4>
      {rows.length ? (
        <table className="w-full text-[11px] text-white/70">
          <thead className="text-white/45">
            <tr>
              <th scope="col" className="py-1 text-start font-medium">
                {copy.results.orfColumns.coordinates}
              </th>
              <th scope="col" className="py-1 text-start font-medium">
                {copy.results.orfColumns.frame}
              </th>
              <th scope="col" className="py-1 text-start font-medium">
                {copy.results.orfColumns.aa}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((orf) => (
              <tr key={`${orf.start}-${orf.end}-${orf.strand}-${orf.frame}`}>
                <td className="py-1 font-mono" dir="ltr">
                  {orf.start.toLocaleString("en-US")}
                </td>
                <td className="py-1 font-mono" dir="ltr">
                  {orf.end.toLocaleString("en-US")}
                </td>
                <td className="py-1" dir="ltr">
                  {dirLabel} {orf.lengthAa}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-[11px] text-white/45">{copy.results.orfNone}</p>
      )}
    </div>
  );
}

function summarise(track: number[], sequenceLength: number, buckets: number): { start: number; end: number; gc: number }[] {
  if (!track.length || sequenceLength <= 0) return [];
  const rows: { start: number; end: number; gc: number }[] = [];
  for (let index = 0; index < buckets; index += 1) {
    const from = Math.floor((index / buckets) * track.length);
    const to = Math.max(from + 1, Math.floor(((index + 1) / buckets) * track.length));
    const slice = track.slice(from, Math.min(to, track.length));
    const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    const start = Math.round((from / track.length) * sequenceLength) + 1;
    const end = Math.round((Math.min(to, track.length) / track.length) * sequenceLength);
    rows.push({ start, end, gc: mean });
  }
  return rows;
}
