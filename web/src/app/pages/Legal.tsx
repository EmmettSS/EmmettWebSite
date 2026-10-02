/** Legal + disclosure pages: privacy, terms and the vulnerability disclosure policy. */
import { Footer } from "../components/Footer";
import { useI18n } from "../i18n";
import { legalCopy, type LegalKey } from "@/content/legal";
import { useSEO } from "@/lib/seo";

export function Legal({ kind }: { kind: LegalKey }) {
  const { lang } = useI18n();
  const doc = legalCopy[lang][kind];
  useSEO({
    title: `${doc.title} ${doc.accent} — ${lang === "fa" ? "امت" : "Emmett"}`,
    description: doc.intro,
    canonical: `${typeof window !== "undefined" ? window.location.origin : ""}/${lang}/${kind}/`,
    lang,
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--deep)]/92 pt-16 text-[var(--text)]">
      <section className="mx-auto max-w-[900px] px-6 pb-10 pt-24 lg:px-12">
        <h1 className="hero-title !text-[clamp(2.6rem,5vw,4.4rem)]">
          {doc.title}
          <br />
          <em>{doc.accent}</em>
        </h1>
        <p className="hero-copy">{doc.intro}</p>
        {doc.pending ? (
          <p className="mt-8 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-xs leading-6 text-amber-100" data-testid="legal-pending">
            <span className="font-mono">{doc.pending.marker}</span> — {doc.pending.note}
          </p>
        ) : null}
      </section>
      <section className="mx-auto max-w-[900px] space-y-8 px-6 pb-24 lg:px-12">
        {doc.sections.map((section) => (
          <article key={section.heading}>
            <h2 className="text-xl text-white/90">{section.heading}</h2>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-white/60">
              {section.body.map((line) => (
                <li key={line}>— {line}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <Footer />
    </main>
  );
}

export default Legal;
