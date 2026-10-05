"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { FormGroup } from "@/components/molecules/form-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, submitContactForm } from "@/lib/api/client";
import type { Catalog } from "@/lib/api/types";

type Status = "idle" | "submitting" | "success" | "error";

interface ContactFormProps {
  catalogs: Catalog[] | null;
}

function optionsFor(catalogs: Catalog[] | null, key: string) {
  return catalogs?.find((catalog) => catalog.key === key)?.options ?? [];
}

/** Contact enums are served by the public DB Catalog API, never duplicated in the client. */
export function ContactForm({ catalogs }: ContactFormProps) {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const projectTypes = optionsFor(catalogs, "project_type");
  const budgetRanges = optionsFor(catalogs, "budget_range");
  const timelines = optionsFor(catalogs, "timeline");
  const catalogsReady = projectTypes.length > 0 && budgetRanges.length > 0 && timelines.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setStatus("submitting");
    setErrorMessage(null);

    const form = new FormData(formElement);
    try {
      await submitContactForm(
        {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          project_type: String(form.get("project_type") ?? ""),
          budget_range: String(form.get("budget_range") ?? ""),
          timeline: String(form.get("timeline") ?? ""),
          message: String(form.get("message") ?? ""),
          consent_given: form.get("consent_given") === "on",
        },
        locale,
      );
      setStatus("success");
      formElement.reset();
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

  if (!catalogsReady) {
    return (
      <p role="status" className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
        {t("catalogUnavailable")}
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
          defaultValue={projectTypes[0]?.key ?? ""}
          className="flex h-11 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors duration-fast ease-emmett-standard focus-visible:border-primary focus-visible:bg-secondary/30 focus-visible:outline-none"
        >
          {projectTypes.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </FormGroup>

      <FormGroup label={t("budgetLabel")} required>
        <select
          name="budget_range"
          required
          defaultValue={budgetRanges.find((option) => option.key === "not_sure")?.key ?? budgetRanges[0]?.key ?? ""}
          className="flex h-11 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors duration-fast ease-emmett-standard focus-visible:border-primary focus-visible:bg-secondary/30 focus-visible:outline-none"
        >
          {budgetRanges.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </FormGroup>

      <FormGroup label={t("timelineLabel")} required>
        <select
          name="timeline"
          required
          defaultValue={timelines.find((option) => option.key === "flexible")?.key ?? timelines[0]?.key ?? ""}
          className="flex h-11 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors duration-fast ease-emmett-standard focus-visible:border-primary focus-visible:bg-secondary/30 focus-visible:outline-none"
        >
          {timelines.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </FormGroup>

      <FormGroup label={t("messageLabel")} required>
        <textarea
          name="message"
          required
          rows={5}
          maxLength={5000}
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
