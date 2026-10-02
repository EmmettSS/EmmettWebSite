/**
 * Pre-rendered fallback for `HeroSystem` (rule 2).
 *
 * Important: the fallback is not a dumb picture — it keeps the meaning (five capabilities,
 * their links and their evidence) and only drops the animation and the canvas. Low-power
 * visitors therefore still get G1 proof and real navigation.
 */
import { Link } from "react-router";
import { useI18n } from "@/app/i18n";
import { CAPABILITY_EDGES, CAPABILITY_NODES, evidencePathFor, entryForCapability, labelFor } from "@/visuals/primitives/capabilities";

export function HeroSystemStatic() {
  const { lang } = useI18n();
  return (
    <div className="flex h-full w-full flex-col justify-center gap-3 p-4" data-scene="HeroSystemStatic">
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITY_NODES.map((node) => {
          const entry = entryForCapability(node);
          const path = evidencePathFor(node, lang);
          return (
            <li key={node.capability}>
              <Link
                to={path ?? `/${lang}/tools`}
                className="flex h-full flex-col gap-1 rounded-2xl border border-[var(--line)] bg-black/30 p-3 text-start hover:border-[var(--bright)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--bright)]"
              >
                <span className="text-xs text-white/85">{labelFor(node.capability, lang)}</span>
                <span className="text-[11px] text-white/55">{entry?.title[lang]}</span>
                <span className="text-[11px] leading-5 text-white/40">{node.edgeNote[lang]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] leading-5 text-white/45">
        {lang === "fa"
          ? `${CAPABILITY_EDGES.length} یال: هر یال یک ترکیب واقعی از توان‌هاست.`
          : `${CAPABILITY_EDGES.length} edges: each one is a real combination of capabilities.`}
      </p>
    </div>
  );
}

export default HeroSystemStatic;
