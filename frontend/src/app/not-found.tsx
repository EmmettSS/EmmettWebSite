/**
 * ۴۰۴ ریشه — فقط برای مسیرهایی که اصلاً به ``[locale]`` نمی‌رسند (خیلی نادر،
 * چون ``proxy.ts`` همیشه locale را resolve می‌کند). متن دوزبانهٔ ایستا چون
 * خارج از NextIntlClientProvider است.
 */
export default function RootNotFound() {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <p style={{ fontSize: "0.875rem", letterSpacing: "0.1em", color: "#6b7280" }}>404</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 600 }}>Page not found / صفحه پیدا نشد</h1>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- خارج از next-intl، next/link قابل استفاده نیست */}
        <a
          href="/"
          style={{
            borderRadius: "0.375rem",
            backgroundColor: "#5b62e0",
            color: "#fff",
            padding: "0.625rem 1.25rem",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Home / خانه
        </a>
      </body>
    </html>
  );
}
