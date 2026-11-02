import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * پیکربندی Vitest جدا از next.config.ts (Next.js از Vite استفاده نمی‌کند،
 * اما Vitest برای تست واحد/کامپوننت نیاز به تنظیمات مستقل خودش دارد:
 * پلاگین React برای JSX/Fast Refresh، محیط jsdom برای تست کامپوننت، و
 * alias یکسان با tsconfig.json برای import با `@/`).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/lib/**/*.ts",
        "src/components/ui/**/*.tsx",
        "src/components/molecules/**/*.tsx",
        "src/components/organisms/**/*.tsx",
        "src/components/seo/**/*.tsx",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/lib/api/types.ts",
        "src/lib/seo/types.ts",
        "src/components/organisms/profile-view.tsx",
      ],
      thresholds: {
        statements: 85,
        branches: 78,
        functions: 85,
        lines: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
});
