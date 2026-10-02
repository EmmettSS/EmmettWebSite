import { createContext, useContext, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

export type Lang = "en" | "fa";
type I18nValue = { lang: Lang; rtl: boolean; path: (slug?: string) => string; switchLanguage: () => void };
const I18n = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { lang: param } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const lang: Lang = param === "fa" ? "fa" : "en";
  const rtl = lang === "fa";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.body.dataset.lang = lang;
    localStorage.setItem("emmett-language", lang);
  }, [lang, rtl]);

  const value = useMemo(() => ({
    lang, rtl,
    path: (slug = "") => `/${lang}${slug ? `/${slug.replace(/^\//, "")}` : ""}`,
    switchLanguage: () => {
      const rest = location.pathname.replace(/^\/(fa|en)/, "");
      navigate(`/${lang === "fa" ? "en" : "fa"}${rest}`);
    },
  }), [lang, location.pathname, navigate, rtl]);

  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n() {
  const value = useContext(I18n);
  if (!value) throw new Error("useI18n must be used inside LanguageProvider");
  return value;
}
