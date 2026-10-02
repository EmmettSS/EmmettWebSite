/**
 * F-11 — versioned configuration.
 *
 * The card rule is explicit: cost numbers must come from a versioned table the team can edit
 * without a deploy. They therefore live in `SiteConfig` (admin) with this file as the documented
 * fallback *baseline* — and the UI always shows which source produced the numbers, including
 * "not configured" when nothing is set. No number here is presented as a quote.
 */
export type CostBand = {
  /** Rough engineering effort in person-weeks, per system profile. */
  weeks: [number, number];
  /** Toman range per person-week, *assumption*, editable in admin. */
  tomanPerPersonWeek: [number, number];
};

export const COST_TABLE_VERSION = "architect-cost-1405.1";

export const COST_BANDS: Record<string, CostBand> = {
  internal_tool: { weeks: [3, 6], tomanPerPersonWeek: [18_000_000, 32_000_000] },
  customer_portal: { weeks: [6, 12], tomanPerPersonWeek: [20_000_000, 36_000_000] },
  data_platform: { weeks: [8, 16], tomanPerPersonWeek: [22_000_000, 40_000_000] },
  ai_assistant: { weeks: [4, 10], tomanPerPersonWeek: [24_000_000, 44_000_000] },
  regulated_system: { weeks: [10, 20], tomanPerPersonWeek: [24_000_000, 44_000_000] },
};

export function tomanRange(profile: string): { weeks: [number, number]; toman: [number, number] } | null {
  const band = COST_BANDS[profile];
  if (!band) return null;
  const [wMin, wMax] = band.weeks;
  const [pMin, pMax] = band.tomanPerPersonWeek;
  return { weeks: band.weeks, toman: [wMin * pMin, wMax * pMax] };
}
