"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormGroup } from "@/components/molecules/form-group";
import { ApiError, submitContactForm } from "@/lib/api/client";

const PROJECT_TYPES = ["website", "mobile_app", "security", "crm", "consulting", "other"] as const;
const BUDGET_RANGES = ["under_50m", "50_150m", "150_500m", "over_500m", "not_sure"] as const;
const TIMELINES = ["immediate", "within_1_month", "within_3_months", "flexible"] as const;

type Status = "idle" | "submitting" | "success" | "error";

/**
 * فرم تماس — POST به ``/api/v1/leads/contact/`` (مسیر نسبی، پراکسی‌شده).
 * قبل از ارسال کوکی CSRF تضمین می‌شود (ر.ک. ``ensureCsrfCookie`` در
 * ``lib/api/client.ts``).
 */
export function ContactForm() {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const form = new FormData(event.currentTarget);
    try {
      await submitContactForm({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        project_type: String(form.get("project_type") ?? "other"),
        budget_range: String(form.get("budget_range") ?? "not_sure"),
        timeline: String(form.get("timeline") ?? "flexible"),
        message: String(form.get("message") ?? ""),
        consent_given: form.get("consent_given") === "on",
      });
      setStatus("success");
      event.currentTarget.reset();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof ApiError ? error.message : t("error"));
    }
  }

  if (status === "success") {
    return (
      <p role="status" className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-foreground">
        {t("success")}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FormGroup label={t("nameLabel")} required>
        <Input name="name" required autoComplete="name" />
      </FormGroup>

      <FormGroup label={t("emailLabel")} required>
        <Input name="email" type="email" required autoComplete="email" />
      </FormGroup>

      <FormGroup label={t("phoneLabel")}>
        <Input name="phone" type="tel" autoComplete="tel" />
      </FormGroup>

      <FormGroup label={t("projectTypeLabel")} required>
        <select
          name="project_type"
          required
          defaultValue="website"
          className="flex h-11 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors duration-fast ease-emmett-standard focus-visible:border-primary focus-visible:bg-secondary/30 focus-visible:outline-none"
        >
          {PROJECT_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`projectTypes.${value}`)}
            </option>
          ))}
        </select>
      </FormGroup>

      <FormGroup label={t("budgetLabel")} required>
        <select
          name="budget_range"
          required
          defaultValue="not_sure"
          className="flex h-11 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors duration-fast ease-emmett-standard focus-visible:border-primary focus-visible:bg-secondary/30 focus-visible:outline-none"
        >
          {BUDGET_RANGES.map((value) => (
            <option key={value} value={value}>
              {t(`budgetRanges.${value}`)}
            </option>
          ))}
        </select>
      </FormGroup>

      <FormGroup label={t("timelineLabel")} required>
        <select
          name="timeline"
          required
          defaultValue="flexible"
          className="flex h-11 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors duration-fast ease-emmett-standard focus-visible:border-primary focus-visible:bg-secondary/30 focus-visible:outline-none"
        >
          {TIMELINES.map((value) => (
            <option key={value} value={value}>
              {t(`timelines.${value}`)}
            </option>
          ))}
        </select>
      </FormGroup>

      <FormGroup label={t("messageLabel")} required>
        <textarea
          name="message"
          required
          rows={5}
          className="flex w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors duration-fast ease-emmett-standard placeholder:text-muted-foreground focus-visible:border-primary focus-visible:bg-secondary/30 focus-visible:outline-none"
        />
      </FormGroup>

      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input name="consent_given" type="checkbox" required className="mt-1 size-4" />
        {t("consentLabel")}
      </label>

      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" size="lg" isLoading={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
