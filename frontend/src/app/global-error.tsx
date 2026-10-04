"use client";

/**
 * global-error.tsx — فقط وقتی فعال می‌شود که خودِ root layout خطا بدهد
 * (نادر). چون بیرون از ``[locale]`` و NextIntlClientProvider قرار دارد،
 * نمی‌تواند از next-intl استفاده کند؛ متن دوزبانهٔ ایستا به‌صورت دستی تکرار
 * شده است. طبق قرارداد Next.js باید خودش ``<html>``/``<body>`` را رندر کند.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
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
        <p style={{ fontSize: "0.875rem", letterSpacing: "0.1em", color: "#6b7280" }}>500</p>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 600 }}>
          Something went wrong / مشکلی پیش آمد
        </h1>
        <p style={{ color: "#6b7280", maxWidth: "32rem" }}>
          An unexpected error occurred. Please try again. / خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش
          کنید.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            borderRadius: "0.375rem",
            backgroundColor: "#5b62e0",
            color: "#fff",
            padding: "0.625rem 1.25rem",
            fontWeight: 500,
          }}
        >
          Try again / تلاش مجدد
        </button>
      </body>
    </html>
  );
}
