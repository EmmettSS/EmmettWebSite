"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/molecules/card";
import { FormGroup } from "@/components/molecules/form-group";
import { Breadcrumb } from "@/components/molecules/breadcrumb";
import { formatNumber } from "@/lib/format/number";
import { formatDate, formatToday } from "@/lib/format/date";
import type { AppLocale } from "@/i18n/routing";
import { frameWidth, pageLeadClass, pageTitleClass } from "@/components/ui-port/page-frame";

type Swatch = {
  /** نام توکن در `:root`؛ مقدار زنده‌اش از CSSOM خوانده می‌شود. */
  token: string;
  /** کلاسی که نمونه را رنگ می‌کند — همان utility که مصرف‌کننده استفاده می‌کند. */
  className: string;
  /** نام توکن، بدون پسوند `--`. شناسهٔ فنی است نه متن کاربر. */
  label: string;
  /** اگر ست شود، نمونه به‌جای جعبهٔ رنگ، متن روی این سطح نشان داده می‌شود. */
  textOnSurface?: string;
};

const COLOR_SWATCHES: readonly Swatch[] = [
  { token: "--background", className: "bg-background border border-border", label: "background" },
  { token: "--foreground", className: "bg-foreground border border-border", label: "foreground" },
  { token: "--card", className: "bg-card border border-border", label: "card" },
  { token: "--primary", className: "bg-primary border border-border", label: "primary" },
  { token: "--secondary", className: "bg-secondary border border-border", label: "secondary" },
  { token: "--muted", className: "bg-muted border border-border", label: "muted" },
  { token: "--accent", className: "bg-accent border border-border", label: "accent (emerald)" },
  {
    token: "--destructive",
    className: "bg-destructive border border-border",
    label: "destructive",
  },
  { token: "--border", className: "bg-border border border-border", label: "border" },
];

const BRAND_SWATCHES: readonly Swatch[] = [
  { token: "--brand-indigo", className: "bg-brand-indigo", label: "brand-indigo" },
  { token: "--brand-emerald", className: "bg-brand-emerald", label: "brand-emerald" },
  { token: "--brand-muted-blue", className: "bg-brand-muted-blue", label: "brand-muted-blue" },
  { token: "--brand-cyan", className: "bg-brand-cyan", label: "brand-cyan" },
  { token: "--surface-obsidian", className: "bg-surface-obsidian", label: "surface-obsidian" },
  { token: "--surface-graphite", className: "bg-surface-graphite", label: "surface-graphite" },
  { token: "--surface-slate", className: "bg-surface-slate", label: "surface-slate" },
  {
    token: "--surface-warm-white",
    className: "bg-surface-warm-white border border-border",
    label: "surface-warm-white",
  },
  {
    token: "--surface-ivory",
    className: "bg-surface-ivory border border-border",
    label: "surface-ivory",
  },
  {
    token: "--surface-soft-gray",
    className: "bg-surface-soft-gray border border-border",
    label: "surface-soft-gray",
  },
];

/**
 * پالت نگاشت‌شده در بستهٔ ۲ (ADR-0039). `--emerald-deep` و
 * `--deep-green-black` پیش‌تر در `:root` بودند ولی در `@theme inline` نگاشت
 * نشده بودند، پس utility نداشتند و کد به هگز خام پناه می‌برد. چهار عضو
 * دیگر پالت دسته‌بندی پیش‌تر فقط هگز خام بودند.
 */
const PALETTE_SWATCHES: readonly Swatch[] = [
  { token: "--emerald-deep", className: "bg-emerald-deep", label: "emerald-deep" },
  { token: "--deep-green-black", className: "bg-deep-green-black", label: "deep-green-black" },
  { token: "--blue-deep", className: "bg-blue-deep", label: "blue-deep" },
  { token: "--teal-deep", className: "bg-teal-deep", label: "teal-deep" },
  { token: "--amber-deep", className: "bg-amber-deep", label: "amber-deep" },
  { token: "--violet-deep", className: "bg-violet-deep", label: "violet-deep" },
];

/**
 * سه توکن متن ملایم کنار هم، تا تفاوت آلفایشان دیده شود: `muted-on-dark`
 * (۰٫۵۸) و `muted-on-light` (۰٫۶۸) لیترال‌های پرتکرار بستهٔ UI بودند و
 * `muted-foreground` (۰٫۵) توکن پوستهٔ برنامه است. این سه عمداً یکی نیستند.
 */
const MUTED_TEXT_SWATCHES: readonly Swatch[] = [
  {
    token: "--muted-on-dark",
    className: "text-muted-on-dark",
    label: "muted-on-dark",
    textOnSurface: "bg-background",
  },
  {
    token: "--muted-on-light",
    className: "text-muted-on-light",
    label: "muted-on-light",
    textOnSurface: "bg-surface-warm-white",
  },
  {
    token: "--muted-foreground",
    className: "text-muted-foreground",
    label: "muted-foreground",
    textOnSurface: "bg-background",
  },
];

const ALL_SWATCHES: readonly Swatch[] = [
  ...COLOR_SWATCHES,
  ...BRAND_SWATCHES,
  ...PALETTE_SWATCHES,
  ...MUTED_TEXT_SWATCHES,
];

/** ترتیب ثابت و بدون تکرار؛ snapshot به همین ترتیب رمز می‌شود. */
const TOKEN_NAMES: readonly string[] = [...new Set(ALL_SWATCHES.map((swatch) => swatch.token))];

function subscribeToStyles(onStoreChange: () => void): () => void {
  // مقدار توکن‌ها پس از بارگذاری شیوه‌نامه ثابت است؛ تنها رویدادی که می‌تواند
  // snapshot را عوض کند کامل‌شدن بارگذاری CSS است (پیش از آن ممکن است
  // getComputedStyle رشتهٔ خالی بدهد).
  window.addEventListener("load", onStoreChange);
  return () => window.removeEventListener("load", onStoreChange);
}

/**
 * snapshot به‌صورت یک **رشته** برگردانده می‌شود، نه شیء: `useSyncExternalStore`
 * با `Object.is` مقایسه می‌کند و شیء تازه در هر فراخوانی باعث حلقهٔ رندر
 * بی‌پایان می‌شود.
 */
function readTokenValues(): string {
  if (typeof document === "undefined") return "";
  const styles = getComputedStyle(document.documentElement);
  return TOKEN_NAMES.map((token) => styles.getPropertyValue(token).trim()).join("|");
}

function readTokenValuesOnServer(): string {
  return "";
}

/**
 * مقدار زندهٔ هر توکن، خوانده‌شده از CSSOM در زمان اجرا. عمداً از
 * `useSyncExternalStore` استفاده می‌شود و نه `useState + useEffect` تا قاعدهٔ
 * `react-hooks/set-state-in-effect` نقض نشود و مقدار سمت سرور هم deterministic
 * بماند.
 *
 * پیش‌تر `lib/hooks/use-has-mounted.ts` در این ریپو دقیقاً همین الگو را پیاده
 * کرده بود و این تابع به آن استناد می‌کرد؛ آن فایل در بستهٔ ۴ به‌عنوان کد
 * مرده حذف شد (هیچ مصرف‌کننده‌ای جز یک تست خودتکرار نداشت). پس این تابع اکنون
 * تنها نمونهٔ آن الگو در ریپو است و دلیلش همین‌جا ثبت می‌ماند تا ارجاع
 * dangling به فایل حذف‌شده باقی نماند.
 */
function useLiveTokenValues(): ReadonlyMap<string, string> {
  const snapshot = useSyncExternalStore(
    subscribeToStyles,
    readTokenValues,
    readTokenValuesOnServer,
  );
  const values = new Map<string, string>();
  if (snapshot.length > 0) {
    snapshot.split("|").forEach((value, index) => {
      const token = TOKEN_NAMES[index];
      if (token) values.set(token, value);
    });
  }
  return values;
}

const SPACING_SCALE = [4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128] as const;

export default function DesignSystemPage() {
  const t = useTranslations("designSystem");
  const locale = useLocale() as AppLocale;
  const [isLoading, setIsLoading] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const tokenValues = useLiveTokenValues();

  return (
    <div className={`${frameWidth.wide} flex flex-col gap-16`}>
      <header className="flex flex-col gap-3">
        <Breadcrumb items={[{ label: "Emmett", href: "/" }, { label: t("title") }]} />
        <h1 className={pageTitleClass}>{t("title")}</h1>
        <p className={pageLeadClass}>{t("description")}</p>
      </header>

      {/* رنگ‌ها */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-medium">{t("colors")}</h2>
          <p className="text-sm text-muted-foreground">{t("tokenStandardLead")}</p>
        </div>

        <SwatchGrid
          swatches={COLOR_SWATCHES}
          values={tokenValues}
          pendingLabel={t("tokenValuePending")}
        />
        <SwatchGrid
          swatches={BRAND_SWATCHES}
          values={tokenValues}
          pendingLabel={t("tokenValuePending")}
        />

        <div className="flex flex-col gap-4 border-t border-border pt-6">
          <h3 className="text-xl font-medium">{t("categoryPalette")}</h3>
          <SwatchGrid
            swatches={PALETTE_SWATCHES}
            values={tokenValues}
            pendingLabel={t("tokenValuePending")}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-6">
          <h3 className="text-xl font-medium">{t("mutedTextPalette")}</h3>
          <SwatchGrid
            swatches={MUTED_TEXT_SWATCHES}
            values={tokenValues}
            pendingLabel={t("tokenValuePending")}
            sampleText={t("mutedTextSample")}
          />
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
              {formatNumber(1234567.5, locale, {
                style: "currency",
                currency: locale === "fa" ? "IRR" : "USD",
              })}
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

function SwatchGrid({
  swatches,
  values,
  pendingLabel,
  sampleText,
}: {
  swatches: readonly Swatch[];
  values: ReadonlyMap<string, string>;
  pendingLabel: string;
  sampleText?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
      {swatches.map((swatch) => (
        <div key={swatch.token} data-token={swatch.token} className="flex flex-col gap-2">
          {swatch.textOnSurface ? (
            <div
              className={`flex h-20 items-center rounded-md border border-border px-3 ${swatch.textOnSurface}`}
            >
              <span className={`text-xs ${swatch.className}`}>{sampleText ?? swatch.label}</span>
            </div>
          ) : (
            <div className={`h-20 rounded-md ${swatch.className}`} />
          )}
          <span className="font-technical text-xs text-muted-foreground">{swatch.label}</span>
          {/* مقدار زندهٔ توکن؛ رشتهٔ فنی است پس در صفحهٔ RTL هم LTR می‌ماند. */}
          <span className="font-technical text-xs text-muted-foreground" dir="ltr">
            {values.get(swatch.token) ?? pendingLabel}
          </span>
        </div>
      ))}
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
