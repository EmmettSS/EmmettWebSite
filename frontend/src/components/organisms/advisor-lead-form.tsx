"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { FormGroup } from "@/components/molecules/form-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, submitAdvisorLead } from "@/lib/api/client";
import type { AIConcept, Catalog } from "@/lib/api/types";

interface AdvisorLeadFormProps {
  token: string;
  concept: AIConcept;
  catalogs: Catalog[] | null;
}

function optionsFor(catalogs: Catalog[], key: string) {
  return catalogs.find((catalog) => catalog.key === key)?.options ?? [];
}

export function AdvisorLeadForm({ token, concept, catalogs }: AdvisorLeadFormProps) {
  const t = useTranslations("ai");
  const contactT = useTranslations("contact");
  const locale = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!catalogs || !["project_type", "budget_range", "timeline"].every((key) =>
    catalogs.some((catalog) => catalog.key === key && catalog.options.length > 0),
  )) {
    return <p role="status" className="mt-5 text-sm text-muted-foreground">{t("catalogUnavailable")}</p>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setIsSubmitting(true);
    try {
      await submitAdvisorLead(
        {
          share_token: token,
          concept_public_id: concept.public_id,
          contact: {
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            phone: String(form.get("phone") ?? ""),
            project_type: String(form.get("project_type") ?? ""),
            budget_range: String(form.get("budget_range") ?? ""),
            timeline: String(form.get("timeline") ?? ""),
            message: String(form.get("message") ?? ""),
            consent_given: form.get("consent_given") === "on",
          },
        },
        locale,
      );
      setSubmitted(true);
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : t("requestError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return <p role="status" className="mt-5 rounded-lg border border-border bg-secondary/30 p-4 text-sm text-foreground">{t("leadSuccess")}</p>;
  }

  const projectTypes = optionsFor(catalogs, "project_type");
  const budgetRanges = optionsFor(catalogs, "budget_range");
  const timelines = optionsFor(catalogs, "timeline");
  const selectClassName =
    "flex h-11 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors duration-fast ease-emmett-standard focus-visible:border-primary focus-visible:bg-secondary/30 focus-visible:outline-none";

  return (
    <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
      <p className="text-sm text-muted-foreground">{t("leadFormDescription")}</p>
      <FormGroup label={contactT("nameLabel")} required>
        <Input name="name" required autoComplete="name" />
      </FormGroup>
      <FormGroup label={contactT("emailLabel")} required>
        <Input name="email" type="email" required autoComplete="email" />
      </FormGroup>
      <FormGroup label={contactT("phoneLabel")}>
        <Input name="phone" type="tel" autoComplete="tel" />
      </FormGroup>
      <FormGroup label={contactT("projectTypeLabel")} required>
        <select name="project_type" required defaultValue={projectTypes[0]?.key ?? ""} className={selectClassName}>
          {projectTypes.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
      </FormGroup>
      <FormGroup label={contactT("budgetLabel")} required>
        <select
          name="budget_range"
          required
          defaultValue={budgetRanges.find((option) => option.key === "not_sure")?.key ?? budgetRanges[0]?.key ?? ""}
          className={selectClassName}
        >
          {budgetRanges.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
      </FormGroup>
      <FormGroup label={contactT("timelineLabel")} required>
        <select
          name="timeline"
          required
          defaultValue={timelines.find((option) => option.key === "flexible")?.key ?? timelines[0]?.key ?? ""}
          className={selectClassName}
        >
          {timelines.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
      </FormGroup>
      <FormGroup label={contactT("messageLabel")}>
        <textarea name="message" rows={3} maxLength={5000} className="flex w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none" />
      </FormGroup>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input name="consent_given" type="checkbox" required className="mt-1 size-4" />
        {contactT("consentLabel")}
      </label>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" variant="secondary" isLoading={isSubmitting}>
        {isSubmitting ? t("sendingLead") : t("requestReview")}
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">{t("contactPrivacyNote")}</p>
    </form>
  );
}
