import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const dist = path.resolve("dist");
const template = await readFile(path.join(dist, "index.html"), "utf8");
const configuredBase = process.env.PUBLIC_SITE_URL;
if (!configuredBase) throw new Error("PUBLIC_SITE_URL is required to emit canonical links and sitemap URLs (set the verified domain; never ship example.invalid).");
const base = new URL(configuredBase).origin;
const routes = [
  { slug: "", fa: { title: "امت | مهندسی نرم‌افزار و هوش مصنوعی", description: "امت سامانه‌های نرم‌افزاری، هوش مصنوعی و امنیت را برای مسائل واقعی مهندسی می‌کند.", body: "مهندسی سامانه‌های نرم‌افزاری، هوش مصنوعی و امنیت برای مسائل واقعی." }, en: { title: "Emmett | Software and AI Engineering", description: "Emmett engineers software, AI and security systems for real-world problems.", body: "Software, AI and security engineering for real-world problems." } },
  { slug: "services", fa: { title: "خدمات مهندسی | امت", description: "از تعریف مسئله تا ساخت سامانهٔ نرم‌افزاری و هوش مصنوعی.", body: "خدمات مهندسی نرم‌افزار و هوش مصنوعی؛ جزئیات خدمات را در وب‌سایت ببینید." }, en: { title: "Engineering Services | Emmett", description: "From problem framing to production software and AI systems.", body: "Software and AI engineering services, from problem framing to delivery." } },
  { slug: "contact", fa: { title: "تماس با امت", description: "برای گفت‌وگو دربارهٔ مسئلهٔ فنی یا همکاری با امت در تماس باشید.", body: "برای گفت‌وگو دربارهٔ همکاری، از راه‌های تماس ثبت‌شده استفاده کنید." }, en: { title: "Contact Emmett", description: "Get in touch with Emmett about an engineering challenge or collaboration.", body: "Contact Emmett to discuss an engineering challenge or collaboration." } },
];
for (const route of routes) for (const locale of ["fa", "en"] as const) {
  const copy = route[locale];
  const dir = locale === "fa" ? "rtl" : "ltr";
  const pathFor = (lang: string) => `/${lang}/${route.slug}${route.slug ? "/" : ""}`;
  const canonical = `${base}${pathFor(locale)}`;
  const faCanonical = `${base}${pathFor("fa")}`;
  const enCanonical = `${base}${pathFor("en")}`;
  const data = { "@context": "https://schema.org", "@type": "Organization", name: locale === "fa" ? "امت" : "Emmett", description: copy.description };
  const html = template
    .replace(/<html[^>]*>/, `<html lang="${locale}" dir="${dir}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(copy.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(copy.description)}">`)
    .replace(/<meta name="robots"[^>]*>/, `<meta name="robots" content="index,follow">`)
    .replace("</head>", `<link rel="canonical" href="${escapeHtml(canonical)}"><link rel="alternate" hreflang="fa" href="${escapeHtml(faCanonical)}"><link rel="alternate" hreflang="en" href="${escapeHtml(enCanonical)}"><link rel="alternate" hreflang="x-default" href="${escapeHtml(faCanonical)}"><script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script></head>`)
    .replace('<div id="root"></div>', `<div id="root"><main><h1>${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.body)}</p></main></div>`);
  const target = path.join(dist, locale, ...(route.slug ? [route.slug] : []), "index.html");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
}
await writeFile(path.join(dist, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n");
const links = routes.flatMap(({ slug }) => ["fa", "en"].map((locale) => {
  const url = `${base}/${locale}/${slug}${slug ? "/" : ""}`;
  return `<url><loc>${escapeHtml(url)}</loc><xhtml:link rel="alternate" hreflang="fa" href="${escapeHtml(`${base}/fa/${slug}${slug ? "/" : ""}`)}"/><xhtml:link rel="alternate" hreflang="en" href="${escapeHtml(`${base}/en/${slug}${slug ? "/" : ""}`)}"/></url>`;
})).join("");
await writeFile(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${links}</urlset>`);
console.log("Static Bridge generated six localized pages, robots.txt and sitemap.xml.");
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!); }
