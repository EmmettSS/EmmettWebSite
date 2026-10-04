import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  ChevronDown,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, NavLink } from "react-router";
import { useI18n } from "../i18n";
import { ui } from "../content";

const slugs = [
  "services",
  "products",
  "projects",
  "resources",
  "academy",
  "about",
];
export function Navbar() {
  const { lang, rtl, path, switchLanguage } = useI18n();
  const t = ui[lang];
  const [mobile, setMobile] = useState(false);
  const [mega, setMega] = useState<"products" | "resources" | null>(null);
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => {
    const nextHidden = y > last.current && y > 240;
    setHidden((current) => (current === nextHidden ? current : nextHidden));
    last.current = y;
  });
  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile]);
  const products =
    lang === "fa"
      ? [
          ["PenTestor", "ارزیابی امنیت، پیش از حمله", "products/pentestor"],
          ["Emmett CRM", "مدیریت هوشمند ارتباط با مشتری", "products/crm"],
          ["همه محصولات", "راهکارهای ساخته‌شده در امت", "products"],
        ]
      : [
          ["PenTestor", "Autonomous security", "products/pentestor"],
          ["Emmett CRM", "Relationship intelligence", "products/crm"],
          ["Product Lab", "Explore every product", "products"],
        ];
  const resources =
    lang === "fa"
      ? [
          ["کتابخانه امت", "تحلیل‌ها و تجربه‌های واقعی", "resources"],
          ["راهنماهای کاربردی", "الگوهایی برای ساخت بهتر", "resources"],
          ["پژوهش و آینده‌نگری", "روندهایی که باید جدی گرفت", "resources"],
        ]
      : [
          ["Field Library", "All notes and research", "resources"],
          ["Playbooks", "Patterns for building better", "resources"],
          ["Research", "Signals from the future", "resources"],
        ];
  return (
    <>
      <motion.nav
        animate={{ y: hidden ? -80 : 0 }}
        transition={{ duration: 0.28 }}
        className="fixed inset-x-0 top-0 z-50 h-16 border-b border-[var(--line)] bg-[#06140e]/78 backdrop-blur-2xl"
      >
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-5 px-5 lg:px-12">
          <Link
            to={path()}
            className="flex items-center gap-2 font-mono tracking-[.2em]"
          >
            <b>EMMETT</b>
            <small className="text-white/25">GROUP</small>
          </Link>
          <div className="hidden items-center gap-6 lg:flex">
            {(t.nav as string[]).map((label, i) => {
              const slug = slugs[i];
              const has = slug === "products" || slug === "resources";
              return (
                <div
                  key={slug}
                  className="relative"
                  onMouseEnter={() => has && setMega(slug as any)}
                  onMouseLeave={() => setMega(null)}
                >
                  <NavLink
                    to={path(slug)}
                    className={({ isActive }) =>
                      `flex items-center gap-1 py-5 text-sm transition ${isActive ? "text-white" : "text-white/48 hover:text-white"}`
                    }
                  >
                    {label}
                    {has && <ChevronDown className="h-3 w-3" />}
                  </NavLink>
                  <AnimatePresence>
                    {mega === slug && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute start-1/2 top-[58px] w-[390px] -translate-x-1/2 rounded-2xl border border-[var(--line)] bg-[#081b13]/96 p-3 shadow-2xl backdrop-blur-2xl"
                      >
                        {(slug === "products" ? products : resources).map(
                          ([a, b, c], j) => (
                            <motion.div
                              key={a}
                              initial={{ opacity: 0, x: rtl ? 12 : -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: j * 0.06 }}
                            >
                              <Link
                                to={path(c)}
                                className="group flex items-center gap-4 rounded-xl p-4 hover:bg-[var(--emerald)]/8"
                              >
                                <span className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--line)] text-[var(--bright)]">
                                  {slug === "products" ? (
                                    j ? (
                                      <Boxes className="h-4 w-4" />
                                    ) : (
                                      <ShieldCheck className="h-4 w-4" />
                                    )
                                  ) : (
                                    <BookOpen className="h-4 w-4" />
                                  )}
                                </span>
                                <span>
                                  <b className="block text-sm">{a}</b>
                                  <small className="text-white/35">{b}</small>
                                </span>
                                <ArrowUpRight className="ms-auto h-4 w-4 text-white/20 transition group-hover:text-[var(--bright)]" />
                              </Link>
                            </motion.div>
                          ),
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div
              className="language-switch"
              role="group"
              aria-label={lang === "fa" ? "انتخاب زبان" : "Choose language"}
            >
              {(["en", "fa"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => code !== lang && switchLanguage()}
                  aria-pressed={code === lang}
                  aria-label={code === "fa" ? "فارسی" : "English"}
                  className="relative grid h-8 min-w-9 place-items-center rounded-full px-2 text-[10px] font-bold"
                >
                  <span className="relative z-10">{code.toUpperCase()}</span>
                  {code === lang && (
                    <motion.span
                      layoutId="active-language"
                      className="absolute inset-0 rounded-full bg-[var(--emerald)] shadow-[0_0_18px_rgba(69,233,155,.22)]"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
            <Link
              to={path("contact")}
              className="primary-btn hidden !px-5 !py-2.5 md:flex"
            >
              {t.start}
            </Link>
            <button
              onClick={() => setMobile(!mobile)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--line)] lg:hidden"
              aria-label="Toggle menu"
            >
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </motion.nav>
      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#06140e]/98 px-6 pt-24 backdrop-blur-2xl lg:hidden"
          >
            {(t.nav as string[]).map((label, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: rtl ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  onClick={() => setMobile(false)}
                  to={path(slugs[i])}
                  className="flex h-16 items-center justify-between border-b border-[var(--line)] text-xl"
                >
                  {label}
                  <ArrowUpRight className="h-4 w-4 text-[var(--bright)]" />
                </Link>
              </motion.div>
            ))}
            <Link
              onClick={() => setMobile(false)}
              to={path("contact")}
              className="primary-btn mt-8 w-full justify-center"
            >
              {t.start}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
