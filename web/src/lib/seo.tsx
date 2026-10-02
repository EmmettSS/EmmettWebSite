import { useEffect } from "react";

export type SeoOptions = {
  title: string;
  description: string;
  canonical: string;
  lang?: "fa" | "en";
  /** Result pages must never be indexed (F-06 result links, share links). */
  robots?: "index,follow" | "noindex,follow" | "noindex,nofollow";
  image?: string;
  type?: "website" | "article";
};

export function useSEO({ title, description, canonical, lang = "fa", robots = "index,follow", image, type = "website" }: SeoOptions) {
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("robots", robots);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", type, "property");
    setMeta("og:url", canonical, "property");
    setMeta("og:locale", lang === "fa" ? "fa_IR" : "en_US", "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (image) {
      setMeta("og:image", image, "property");
      setMeta("twitter:image", image);
    }
    setLink("canonical", canonical);
    setLink("alternate", canonical.replace(`/${lang}/`, `/${lang === "fa" ? "en" : "fa"}/`), "hreflang", lang === "fa" ? "en" : "fa");
    setLink("alternate", canonical.replace(/\/(fa|en)\//, "/fa/"), "hreflang", "x-default");
  }, [title, description, canonical, lang, robots, image, type]);
}

function setMeta(name: string, content: string, attribute = "name") {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.append(element);
  }
  element.content = content;
}

function setLink(rel: string, href: string, attribute?: string, value?: string) {
  const selector = `link[rel="${rel}"]${attribute ? `[${attribute}="${value}"]` : ""}`;
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    if (attribute && value) element.setAttribute(attribute, value);
    document.head.append(element);
  }
  element.href = href;
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export type ToolSeoInput = {
  title: string;
  description: string;
  slug: { fa: string; en: string };
  lang: "fa" | "en";
  keywords: string[];
  version: string;
  siteOrigin: string;
  noindex?: boolean;
  howToSteps?: { name: string; text: string }[];
};

/** Shared SEO/JSON-LD builder for every /tools/* route (card §۷). */
export function toolJsonLd(input: ToolSeoInput): Record<string, unknown> {
  const path = input.slug[input.lang];
  const url = `${input.siteOrigin}/${input.lang}/tools/${path}/`;
  const graph: Record<string, unknown>[] = [
    {
      "@type": "SoftwareApplication",
      name: input.title,
      description: input.description,
      url,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any (browser)",
      softwareVersion: input.version,
      offers: { "@type": "Offer", price: "0", priceCurrency: "IRR" },
      inLanguage: input.lang === "fa" ? "fa-IR" : "en",
      keywords: input.keywords.join(", "),
      isAccessibleForFree: true,
      publisher: { "@type": "Organization", name: input.lang === "fa" ? "امت" : "Emmett" },
    },
  ];
  if (input.howToSteps?.length) {
    graph.push({
      "@type": "HowTo",
      name: input.title,
      inLanguage: input.lang === "fa" ? "fa-IR" : "en",
      step: input.howToSteps.map((step, index) => ({ "@type": "HowToStep", position: index + 1, name: step.name, text: step.text })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function absoluteUrl(origin: string, path: string): string {
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
