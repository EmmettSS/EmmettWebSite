/**
 * F-13 — the site-wide “message us on Telegram” CTA.
 *
 * Honest states, in order of preference:
 *  1. handle configured in `SiteConfig` → a real deep link with a source-specific pre-filled
 *     message and UTM attribution inside the text;
 *  2. handle not configured (B5 still open) → a disabled button plus a visible `[INPUT B5]`
 *     marker instead of a link that pretends to work;
 *  3. API unreachable → same disabled state, worded for an offline visitor.
 */
import { Send } from "lucide-react";
import { useI18n } from "@/app/i18n";
import { trackGoal } from "@/lib/analytics";
import { buildTelegramLink, isConfiguredHandle, useSiteConfig, type ContactSource } from "./link";

const COPY = {
  fa: {
    label: "پیام در تلگرام",
    hint: "سریع‌ترین راه گفت‌وگو",
    notConfigured: "[INPUT B5] نام کاربری تلگرام هنوز در پیکربندی سایت ثبت نشده است؛ پس از ورود تیم، همین دکمه فعال می‌شود.",
    offline: "پیکربندی سایت در دسترس نیست؛ دکمه تا برقراری ارتباط غیرفعال می‌ماند.",
  },
  en: {
    label: "Message on Telegram",
    hint: "Fastest way to talk",
    notConfigured: "[INPUT B5] The Telegram handle is not set in the site configuration yet; this button activates as soon as the team provides it.",
    offline: "Site configuration is unreachable; the button stays disabled until the service responds.",
  },
} as const;

export type TelegramCtaProps = {
  source: ContactSource;
  variant?: "primary" | "ghost";
  className?: string;
};

export function TelegramCta({ source, variant = "primary", className = "" }: TelegramCtaProps) {
  const { lang } = useI18n();
  const copy = COPY[lang];
  const { status, telegramHandle } = useSiteConfig();
  const configured = isConfiguredHandle(telegramHandle);

  if (!configured) {
    const reason = status === "error" ? copy.offline : copy.notConfigured;
    return (
      <span className={`inline-flex flex-col gap-1 ${className}`} data-testid="telegram-not-configured">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm text-white/40"
        >
          <Send className="h-4 w-4" />
          {copy.label}
        </button>
        <span className="max-w-md font-mono text-[10px] leading-5 text-amber-200/80">{reason}</span>
      </span>
    );
  }

  const href = buildTelegramLink(telegramHandle as string, source, lang, typeof window !== "undefined" ? window.location.origin : "https://emmett.ir");
  const styles =
    variant === "primary"
      ? "rounded-full bg-[var(--emerald)] px-7 py-4 font-semibold text-white"
      : "rounded-full border border-[var(--line)] px-6 py-3 text-sm text-white/80 hover:border-[var(--bright)] hover:text-white";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="telegram-cta"
      data-source={source}
      onClick={() => trackGoal("telegram_click", source)}
      className={`inline-flex items-center gap-2 ${styles} ${className}`}
    >
      <Send className="h-4 w-4" />
      {copy.label}
      <span className="sr-only"> — {copy.hint}</span>
    </a>
  );
}

export default TelegramCta;
