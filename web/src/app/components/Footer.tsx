import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiGet } from "@/lib/api-client";
import { ui } from "../content";
import { useI18n } from "../i18n";

type Health = { status?: string };

/**
 * Real service status: the badge reflects an actual `/health/` call, never a decorative
 * green dot. When the API cannot be reached the footer says so instead of claiming uptime.
 */
function ServiceStatus({ lang }: { lang: "fa" | "en" }) {
  const t = ui[lang];
  const [state, setState] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    let cancelled = false;
    apiGet<Health>("/health/", { timeoutMs: 6000 })
      .then((data) => {
        if (!cancelled) setState(data?.status === "ok" || data?.status === "degraded" ? "online" : "offline");
      })
      .catch(() => {
        if (!cancelled) setState("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = state === "checking" ? t.statusChecking : state === "online" ? t.statusOnline : t.statusOffline;
  const tone = state === "online" ? "bg-[var(--bright)]" : state === "checking" ? "bg-white/40" : "bg-amber-400";

  return (
    <span className="flex items-center gap-2" data-testid="service-status" data-status={state}>
      <i className={`h-1.5 w-1.5 rounded-full ${tone} ${state === "online" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

export function Footer() {
  const { lang, path } = useI18n();
  const groups: [string, [string, string][]][] =
    lang === "fa"
      ? [
          ["شرکت", [["درباره ما", "about"], ["تماس", "contact"]]],
          ["فعالیت", [["خدمات", "services"], ["محصولات", "products"], ["پروژه‌ها", "projects"]]],
          ["یادگیری", [["منابع", "resources"], ["آکادمی", "academy"], ["ابزارها", "tools"]]],
        ]
      : [
          ["Company", [["About", "about"], ["Contact", "contact"]]],
          ["Work", [["Services", "services"], ["Products", "products"], ["Projects", "projects"]]],
          ["Learn", [["Resources", "resources"], ["Academy", "academy"], ["Tools", "tools"]]],
        ];
  const legal: [string, string][] =
    lang === "fa"
      ? [["حریم خصوصی", "privacy"], ["شرایط استفاده", "terms"], ["افشای آسیب‌پذیری", "security"]]
      : [["Privacy", "privacy"], ["Terms", "terms"], ["Disclosure", "security"]];

  return (
    <footer className="relative overflow-hidden border-t border-[var(--line)] bg-[#05110c]">
      <div className="mx-auto max-w-[1280px] px-6 pb-8 pt-20 lg:px-12">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-3">
          {groups.map(([heading, links]) => (
            <div key={heading}>
              <p className="mb-5 text-xs text-white/55">{heading}</p>
              <div className="space-y-3">
                {links.map(([label, target]) => (
                  <Link key={label} className="block text-sm text-white/55 hover:text-[var(--bright)]" to={path(target)}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/45">
          {legal.map(([label, target]) => (
            <Link key={label} to={path(target)} className="hover:text-[var(--bright)]">
              {label}
            </Link>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-5 border-t border-[var(--line)] pt-7 text-xs text-white/55">
          <ServiceStatus lang={lang} />
          <span>© {new Date().getFullYear()} Emmett</span>
          {/* Social links stay out until the real profiles arrive ([INPUT B11]); no dead icons. */}
        </div>
        <div className="footer-wordmark mt-12" aria-hidden="true" />
      </div>
    </footer>
  );
}
