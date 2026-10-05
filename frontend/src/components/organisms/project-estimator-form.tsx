"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock3 } from "lucide-react";

import { FormGroup } from "@/components/molecules/form-group";
import { AIProjectContextFields } from "@/components/organisms/ai-project-context-fields";
import { Button } from "@/components/ui/button";
import { ApiError, estimateProject } from "@/lib/api/client";
import { Link } from "@/i18n/navigation";
import type { Catalog, ProjectEstimateResponse } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { formatNumber } from "@/lib/format/number";

interface ProjectEstimatorFormProps {
  catalogs: Catalog[] | null;
}

function catalogOptions(catalogs: Catalog[], key: string) {
  return catalogs.find((catalog) => catalog.key === key)?.options ?? [];
}

export function ProjectEstimatorForm({ catalogs }: ProjectEstimatorFormProps) {
  const t = useTranslations("ai");
  const locale = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<ProjectEstimateResponse | null>(null);

  const requiredCatalogs = [
    "job_role",
    "business_size",
    "city_scale",
    "budget_range",
    "team_size",
    "goal",
    "delivery_scope",
  ];
  const ready = catalogs !== null && requiredCatalogs.every((key) =>
    catalogs.some((catalog) => catalog.key === key && catalog.options.length > 0),
  );
  if (!ready || !catalogs) {
    return <p role="status" className="rounded-lg border border-border p-4 text-sm text-muted-foreground">{t("catalogUnavailable")}</p>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const goals = form.getAll("goals").map(String);
    if (goals.length === 0) {
      setError(t("goalsRequired"));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await estimateProject(
        {
          job_role: String(form.get("job_role") ?? ""),
          business_size: String(form.get("business_size") ?? ""),
          city_scale: String(form.get("city_scale") ?? ""),
          budget_range: String(form.get("budget_range") ?? ""),
          team_size: String(form.get("team_size") ?? ""),
          goals,
          delivery_scope: String(form.get("delivery_scope") ?? ""),
        },
        locale,
      );
      setEstimate(response);
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : t("requestError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const scopeOptions = catalogOptions(catalogs, "delivery_scope");
  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <AIProjectContextFields catalogs={catalogs} />
        <FormGroup label={t("deliveryScopeLabel")} required>
          <select
            name="delivery_scope"
            required
            defaultValue={scopeOptions.find((option) => option.key === "mvp")?.key ?? scopeOptions[0]?.key ?? ""}
            className="flex h-11 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors duration-fast ease-emmett-standard focus-visible:border-primary focus-visible:bg-secondary/30 focus-visible:outline-none"
          >
            {scopeOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </FormGroup>
        <p className="rounded-lg border border-border bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
          {t("estimateDisclaimer")}
        </p>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" size="lg" isLoading={isSubmitting}>
          {isSubmitting ? t("estimating") : t("estimateProject")}
        </Button>
      </form>

      {estimate ? (
        <section aria-live="polite" className="mt-8 rounded-xl border border-border bg-secondary/20 p-6">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock3 aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("estimateResultTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{estimate.delivery_scope_label}</p>
              {estimate.minimum_working_days !== null ? (
                <p className="mt-4 text-2xl font-semibold text-foreground">
                  {t("minimumDays", { days: formatNumber(estimate.minimum_working_days, locale as AppLocale) })}
                </p>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">{t("estimateUnavailable")}</p>
              )}
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("estimateDisclaimer")}</p>
              <Button asChild variant="secondary" className="mt-5">
                <Link href="/contact">{t("requestQuote")}</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
