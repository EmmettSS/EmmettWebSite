import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * نسخه‌های locale-aware از APIهای ناوبری Next.js؛ همیشه این‌ها را به‌جای
 * `next/link` و `next/navigation` خام در کامپوننت‌های اپ استفاده کنید تا
 * پیشوند locale به‌طور خودکار مدیریت شود.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
