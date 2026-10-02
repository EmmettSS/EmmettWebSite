/**
 * Site configuration from the API (`/site-config/`), used by the surfaces whose copy is
 * editable in the admin: the Telegram CTA (F-13), the lab throughput numbers (F-09) and the
 * "what we are building now" line. When a field is empty the UI says so — it never fills the
 * gap with invented copy.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";

export type SiteConfigResponse = {
  brand_en: string;
  brand_fa: string;
  telegram_handle: string;
  building_fa: string;
  building_en: string;
  lab_samples_per_day: number | null;
  lab_turnaround_hours: number | null;
  lab_tests_per_sample: number | null;
};

export type SiteConfigState = {
  status: "loading" | "ready" | "error";
  config: SiteConfigResponse | null;
};

export function useSiteConfig(): SiteConfigState {
  const [state, setState] = useState<SiteConfigState>({ status: "loading", config: null });

  const load = useCallback(() => {
    let cancelled = false;
    apiGet<SiteConfigResponse>("/site-config/", { timeoutMs: 8000 })
      .then((config) => {
        if (!cancelled) setState({ status: "ready", config });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", config: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  return state;
}
