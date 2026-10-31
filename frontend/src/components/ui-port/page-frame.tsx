import type { ReactNode } from "react";
import { Rss } from "lucide-react";

/**
 * قاب صفحات داخلی — همان زبان بصری پوستهٔ UI (پس‌زمینهٔ تیره، خط زمردی،
 * عنوان بزرگ). داده و متن هر صفحه دست نخورده می‌ماند؛ فقط ظرف عوض می‌شود.
 */
export const frameWidth = {
  wide: "mx-auto max-w-[1440px] px-6 pt-28 pb-20 lg:px-12",
  reading: "mx-auto max-w-3xl px-6 pt-28 pb-20 lg:px-12",
  narrow: "mx-auto max-w-2xl px-6 pt-28 pb-20 lg:px-12",
  results: "mx-auto max-w-4xl px-6 pt-28 pb-20 lg:px-12",
} as const;

export const pageTitleClass =
  "text-[clamp(2rem,4.5vw,3.25rem)] font-medium leading-[1.1] tracking-tight text-foreground";

export const pageLeadClass =
  "mt-4 max-w-[52ch] text-base leading-relaxed text-[rgba(243,250,246,0.55)]";

export const pageSummaryClass = "mt-4 text-lg leading-relaxed text-[rgba(243,250,246,0.55)]";

export const sectionTitleClass = "text-xl font-medium tracking-tight text-foreground";

export const panelClass = "rounded-xl border border-border bg-card p-5 sm:p-8";

export function PageEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="h-px w-6 bg-primary" />
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{children}</p>
    </div>
  );
}

export function FeedLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 text-sm text-primary transition-colors hover:text-accent"
    >
      <Rss aria-hidden="true" className="size-4" />
      {children}
    </a>
  );
}
