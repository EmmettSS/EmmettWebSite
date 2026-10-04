import { setRequestLocale } from "next-intl/server";

import { Hero } from "@/components/organisms/hero";
import type { AppLocale } from "@/i18n/routing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  return <Hero />;
}
