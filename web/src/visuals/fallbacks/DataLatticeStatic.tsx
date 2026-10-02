/** Pre-rendered fallback for `DataLattice`: tier budgets as a plain table (rule 2 + rule 6). */
import { useI18n } from "@/app/i18n";

const ROWS = [
  { tier: "full", note: { fa: "۶۰ فریم، DPR ≤ ۲", en: "60 fps, DPR ≤ 2" } },
  { tier: "balanced", note: { fa: "۲۴ فریم، DPR = ۱", en: "24 fps, DPR = 1" } },
  { tier: "low-power", note: { fa: "بدون صحنهٔ زنده", en: "No live scene" } },
];

export function DataLatticeStatic() {
  const { lang } = useI18n();
  return (
    <table className="h-full w-full text-start text-xs text-white/75" data-scene="DataLatticeStatic">
      <caption className="sr-only">{lang === "fa" ? "بودجهٔ هر سطح دستگاه" : "Frame budget per device tier"}</caption>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.tier}>
            <th scope="row" className="px-3 py-2 text-start font-mono text-white/60">
              {row.tier}
            </th>
            <td className="px-3 py-2">{row.note[lang]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default DataLatticeStatic;
