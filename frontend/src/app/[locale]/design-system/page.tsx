"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/molecules/card";
import { FormGroup } from "@/components/molecules/form-group";
import { Breadcrumb } from "@/components/molecules/breadcrumb";
import { formatNumber } from "@/lib/format/number";
import { formatDate, formatToday } from "@/lib/format/date";
import type { AppLocale } from "@/i18n/routing";

const COLOR_SWATCHES = [
  { className: "bg-background", label: "background" },
  { className: "bg-foreground", label: "foreground" },
  { className: "bg-card", label: "card" },
  { className: "bg-primary", label: "primary (indigo)" },
  { className: "bg-secondary", label: "secondary" },
  { className: "bg-muted", label: "muted" },
  { className: "bg-accent", label: "accent (emerald)" },
  { className: "bg-destructive", label: "destructive" },
  { className: "bg-border", label: "border" },
] as const;

const BRAND_SWATCHES = [
  { className: "bg-brand-indigo", label: "brand-indigo" },
  { className: "bg-brand-emerald", label: "brand-emerald" },
  { className: "bg-brand-muted-blue", label: "brand-muted-blue" },
  { className: "bg-brand-cyan", label: "brand-cyan" },
  { className: "bg-surface-obsidian", label: "surface-obsidian" },
  { className: "bg-surface-graphite", label: "surface-graphite" },
  { className: "bg-surface-slate", label: "surface-slate" },
  { className: "bg-surface-warm-white border border-border", label: "surface-warm-white" },
  { className: "bg-surface-ivory border border-border", label: "surface-ivory" },
  { className: "bg-surface-soft-gray border border-border", label: "surface-soft-gray" },
] as const;

const SPACING_SCALE = [4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128] as const;

export default function DesignSystemPage() {
  const t = useTranslations("designSystem");
  const locale = useLocale() as AppLocale;
  const [isLoading, setIsLoading] = useState(false);
  const [nameValue, setNameValue] = useState("");

  return (
    <div className="mx-auto flex max-w-(--breakpoint-xl) flex-col gap-16 px-4 py-16 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-3">
        <Breadcrumb items={[{ label: "Emmett", href: "/" }, { label: t("title") }]} />
        <h1 className="text-4xl font-medium tracking-tight">{t("title")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
      </header>

      {/* رنگ‌ها */}
      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-medium">{t("colors")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {COLOR_SWATCHES.map((swatch) => (
            <div key={swatch.label} className="flex flex-col gap-2">
              <div className={`h-20 rounded-md border border-border ${swatch.className}`} />
              <span className="font-technical text-xs text-muted-foreground">{swatch.label}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {BRAND_SWATCHES.map((swatch) => (
            <div key={swatch.label} className="flex flex-col gap-2">
              <div className={`h-20 rounded-md ${swatch.className}`} />
              <span className="font-technical text-xs text-muted-foreground">{swatch.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* تایپوگرافی */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-medium">{t("typography")}</h2>
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <p className="text-6xl font-medium leading-[1.02]">type/hero</p>
          <p className="text-5xl font-medium leading-[1.05]">type/display</p>
          <p className="text-4xl font-medium leading-[1.1]">type/h1</p>
          <p className="text-2xl font-medium leading-[1.2]">type/h2</p>
          <p className="text-xl font-medium leading-[1.25]">type/h3</p>
          <p className="text-lg leading-[1.5]">type/body-lg — نمونهٔ متن بدنهٔ بزرگ</p>
          <p className="text-base leading-[1.5]">type/body — نمونهٔ متن بدنهٔ معمولی</p>
          <p className="text-sm leading-[1.4]">type/small — نمونهٔ متن کوچک</p>
          <p className="font-technical text-xs uppercase tracking-[0.04em] text-muted-foreground">
            type/metadata — CASE STUDY №04
          </p>
          <p className="font-technical text-sm">type/technical — 01 / 02 / 03</p>
        </div>
      </section>

      {/* فاصله‌گذاری */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-medium">{t("spacing")}</h2>
        <div className="flex flex-col gap-2">
          {SPACING_SCALE.map((px) => (
            <div key={px} className="flex items-center gap-3">
              <span className="w-12 font-technical text-xs text-muted-foreground">{px}px</span>
              <div className="h-3 rounded-sm bg-primary" style={{ width: `${px}px` }} />
            </div>
          ))}
        </div>
      </section>

      {/* دکمه‌ها */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-medium">{t("buttons")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">{t("buttonVariant.primary")}</Button>
          <Button variant="secondary">{t("buttonVariant.secondary")}</Button>
          <Button variant="ghost">{t("buttonVariant.ghost")}</Button>
          <Button variant="primary" isLoading={isLoading} onClick={() => setIsLoading((v) => !v)}>
            {isLoading ? t("buttonVariant.loading") : t("buttonVariant.primary")}
          </Button>
          <Button variant="primary" disabled>
            {t("buttonVariant.disabled")}
          </Button>
        </div>
      </section>

      {/* عناصر فرم */}
      <section className="flex max-w-md flex-col gap-4">
        <h2 className="text-2xl font-medium">{t("formElements")}</h2>
        <FormGroupDemo nameValue={nameValue} setNameValue={setNameValue} />
      </section>

      {/* برچسب‌ها و آواتار */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-medium">{t("badges")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="neutral">neutral</Badge>
          <Badge variant="accent">accent</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="technical">LEVEL: INTERMEDIATE</Badge>
        </div>

        <h2 className="mt-4 text-2xl font-medium">{t("avatar")}</h2>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="https://github.com/vercel.png" alt="" />
            <AvatarFallback>EM</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>FA</AvatarFallback>
          </Avatar>
        </div>
      </section>

      {/* کارت‌ها */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-medium">{t("cards")}</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Pentestor</CardTitle>
              <CardDescription>Security Engineering</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                سیستم‌های امنیتی ساخته‌شده برای محیط‌های واقعی.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="secondary">
                {t("buttons")}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* نمونهٔ تاریخ و عدد */}
      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-medium">{t("dateNumberSample")}</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-md border border-border p-4">
            <dt className="font-technical text-xs text-muted-foreground">{t("today")}</dt>
            <dd className="text-lg">{formatToday(locale)}</dd>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border p-4">
            <dt className="font-technical text-xs text-muted-foreground">{t("sampleAmount")}</dt>
            <dd className="text-lg">
              {formatNumber(1234567.5, locale, { style: "currency", currency: locale === "fa" ? "IRR" : "USD" })}
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border p-4">
            <dt className="font-technical text-xs text-muted-foreground">formatDate(withTime)</dt>
            <dd className="text-lg">{formatDate(new Date(), locale, { withTime: true })}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function FormGroupDemo({
  nameValue,
  setNameValue,
}: {
  nameValue: string;
  setNameValue: (value: string) => void;
}) {
  const t = useTranslations("form");

  return (
    <FormGroup label={t("nameLabel")} required>
      <Input
        placeholder={t("namePlaceholder")}
        value={nameValue}
        onChange={(event) => setNameValue(event.target.value)}
      />
    </FormGroup>
  );
}
