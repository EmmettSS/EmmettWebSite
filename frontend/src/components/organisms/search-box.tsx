"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

interface SearchBoxProps {
  initialQuery: string;
}

export function SearchBox({ initialQuery }: SearchBoxProps) {
  const t = useTranslations("search");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
        className="flex-1"
      />
      <Button type="submit">{t("submit")}</Button>
    </form>
  );
}
