/** همان تنظیم سیستم که قاعدهٔ سراسری CSS هم به آن گوش می‌دهد. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
