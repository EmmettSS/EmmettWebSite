import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  typescript: {
    // هرگز نباید در CI/production فعال شود؛ خطاهای TS باید build را بشکنند.
    ignoreBuildErrors: false,
  },
};

export default withNextIntl(nextConfig);
