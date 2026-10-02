import { useEffect } from "react";
export function useSEO({ title, description, canonical, lang = "fa" }: { title: string; description: string; canonical: string; lang?: "fa" | "en" }) {
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property"); setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("twitter:card", "summary_large_image");
    setLink("canonical", canonical);
    setLink("alternate", canonical.replace(`/${lang}/`, `/${lang === "fa" ? "en" : "fa"}/`), "hreflang", lang === "fa" ? "en" : "fa");
    setLink("alternate", canonical.replace(/\/(fa|en)\//, "/fa/"), "hreflang", "x-default");
  }, [title, description, canonical, lang]);
}
function setMeta(name: string, content: string, attribute = "name") {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, name); document.head.append(element); }
  element.content = content;
}
function setLink(rel: string, href: string, attribute?: string, value?: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]${attribute ? `[${attribute}="${value}"]` : ""}`);
  if (!element) { element = document.createElement("link"); element.rel = rel; if (attribute && value) element.setAttribute(attribute, value); document.head.append(element); }
  element.href = href;
}
export function JsonLd({ data }: { data: Record<string, unknown> }) { return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />; }
