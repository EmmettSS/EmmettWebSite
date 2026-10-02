import type { ToolMeta } from "@/features/toolbox/types";

export const meta: ToolMeta = {
  id: "check-security",
  slug: { fa: "check-security", en: "check-security" },
  title: { fa: "چک‌آپ امنیتی دامنه", en: "Domain security check-up" },
  subtitle: {
    fa: "شش بخش عمومی، گرید A تا F، فقط بررسی passive.",
    en: "Six public surfaces, an A-to-F grade, passive only.",
  },
  description: {
    fa: "هدرهای امنیتی، TLS، رکوردهای DNS، کوکی‌ها، قرارگیری محتوا و نشت اطلاعات را با یک درخواست HTTPS و رکوردهای عمومی DNS بررسی می‌کند و گزارش قابل اشتراک می‌سازد. هیچ پورت‌اسکن یا تلاش نفوذی انجام نمی‌شود.",
    en: "Checks security headers, TLS, DNS records, cookies, content placement and information leaks using a single HTTPS request plus public DNS records, then produces a shareable report. No port scan and no intrusion attempt.",
  },
  capability: "security",
  version: "1.0.0",
  updatedFa: "۱۴۰۵/۰۷/۱۰",
  keywords: {
    fa: ["امنیت", "اسکن دامنه", "هدر امنیتی", "TLS", "DNS", "SPF", "DMARC", "گرید امنیتی", "چک‌آپ"],
    en: ["security", "domain scan", "security headers", "TLS", "DNS", "SPF", "DMARC", "grade", "check-up"],
  },
  evidence: {
    fa: "نگهبان‌های مسیر شبکه در کد enforced شده‌اند و تست نگهبان دارند.",
    en: "The network envelope is enforced in code and has its own guard tests.",
  },
  howItWorks: {
    fa: [
      "هر بررسی از یک choke point عبور می‌کند که فقط پورت‌های ۸۰ و ۴۴۳ را می‌پذیرد؛ دامنه‌های مسدودشده پیش از ساخت job رد می‌شوند.",
      "اسکن در صف cron اجرا می‌شود و صفحه با polling پیشرفت را نشان می‌دهد؛ هر بخش timeout پنج ثانیه دارد و شکست یک بخش، بقیه را متوقف نمی‌کند.",
      "نمرهٔ هر بخش ۰ تا ۱۰۰ و وزن‌دار است؛ وزن‌ها در پیکربندی سرور تعریف می‌شوند تا بدون deploy قابل تنظیم باشند.",
    ],
    en: [
      "Every check passes a single choke point that only accepts ports 80 and 443; blocklisted domains are rejected before a job row is created.",
      "The scan runs on the cron queue while the page polls progress; each section has a five-second timeout and one failure never stops the rest.",
      "Each section scores 0–100 with configurable weights, so the team can tune them without a deploy.",
    ],
  },
  codeSamples: [
    {
      label: "guard · transport.py",
      language: "python",
      code: `def _validate(url: str) -> urllib.parse.ParseResult:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise PassiveGuardError(f"Scheme not allowed: {parsed.scheme!r}")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    if port not in (80, 443):
        raise PassiveGuardError(f"Port {port} is outside the passive envelope")
    return parsed`,
    },
  ],
  limitations: {
    fa: [
      "فقط دامنه‌ای را بررسی کنید که مالک آن هستید یا اجازه دارید؛ مسئولیت استفاده بر عهدهٔ کاربر است (مادهٔ ۷۲۹ قانون مجازات اسلامی).",
      "بررسی صرفاً passive است: هیچ پورت‌اسکن، payload یا brute-force انجام نمی‌شود و نتیجه جای تست نفوذ را نمی‌گیرد.",
      "نتایج پس از ۷ روز حذف می‌شوند و نسخهٔ عمومی، نسخهٔ دقیق سرویس‌دهنده را ماسک می‌کند.",
    ],
    en: [
      "Only scan a domain you own or are allowed to test; you are responsible for lawful use (Article 729 of the Iranian Penal Code).",
      "The check is passive only: no port scan, payload or brute force, and the report never replaces a penetration test.",
      "Results are deleted after 7 days and the public report masks the exact software version.",
    ],
  },
  disclaimers: {
    fa: ["این بررسی فقط اطلاعات عمومی را می‌خواند و هیچ دسترسی یا تلاش برای نفوذ انجام نمی‌دهد."],
    en: ["This check only reads public information and performs no access or intrusion attempt."],
  },
  offlineCapable: false,
  noindexResults: true,
};

export default meta;
