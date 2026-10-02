/**
 * F-10 data access: the CI artefact produced by `scripts/bundle-budget.ts --emit public/data`.
 * The page never estimates: when the artefact is missing it says so and links to the CI job.
 */
import { isBundleStats, type BundleStats } from "./metrics";

export const BUNDLE_STATS_PATH = "/data/bundle-stats.json";

export async function loadBundleStats(fetcher: typeof fetch = fetch): Promise<BundleStats | null> {
  try {
    const response = await fetcher(BUNDLE_STATS_PATH, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return isBundleStats(payload) ? payload : null;
  } catch {
    return null;
  }
}
