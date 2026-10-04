"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeNewsletter } from "@/lib/api/client";

export function NewsletterForm() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    try {
      await subscribeNewsletter({ email, locale_preference: locale });
      setStatus("success");
      event.currentTarget.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return <p className="text-sm text-foreground">{t("newsletterSuccess")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
      <Input
        name="email"
        type="email"
        required
        placeholder={t("newsletterPlaceholder")}
        className="max-w-xs"
      />
      <Button type="submit" variant="secondary" isLoading={status === "submitting"}>
        {t("newsletterSubmit")}
      </Button>
    </form>
  );
}
