"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { AIProjectContextFields } from "@/components/organisms/ai-project-context-fields";
import { ApiError, createAdvisorSuggestion } from "@/lib/api/client";
import { useRouter } from "@/i18n/navigation";
import type { Catalog } from "@/lib/api/types";

interface CreativeAdvisorFormProps {
  catalogs: Catalog[] | null;
}

export function CreativeAdvisorForm({ catalogs }: CreativeAdvisorFormProps) {
  const t = useTranslations("ai");
  const locale = useLocale();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredCatalogs = ["job_role", "business_size", "city_scale", "budget_range", "team_size", "goal"];
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
      const result = await createAdvisorSuggestion(
        {
          job_role: String(form.get("job_role") ?? ""),
          business_size: String(form.get("business_size") ?? ""),
          city_scale: String(form.get("city_scale") ?? ""),
          budget_range: String(form.get("budget_range") ?? ""),
          team_size: String(form.get("team_size") ?? ""),
          goals,
        },
        locale,
      );
      router.push(`/advisor/results/${result.share_token}`);
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : t("requestError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <AIProjectContextFields catalogs={catalogs} />
      <p className="rounded-lg border border-border bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
        {t("privacyNote")}
      </p>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" isLoading={isSubmitting}>
        {isSubmitting ? t("generating") : t("generateIdeas")}
      </Button>
    </form>
  );
}
