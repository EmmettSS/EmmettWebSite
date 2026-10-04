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
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
});
