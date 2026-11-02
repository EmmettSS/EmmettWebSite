import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { Hero } from "./hero";

/**
 * تست‌های hero — نگهبان ADR-0042.
 *
 * رگرسیونی که این تست می‌بندد: نسخهٔ پیشین با `motion/react` ساخته می‌شد و
 * Next مقدار `initial={{ opacity: 0 }}` را داخل HTML پخته‌شده می‌نوشت، یعنی
 * بزرگ‌ترین متن صفحه تا پایان hydration نامرئی بود و LCP به ۱٫۴ ثانیه رسید
 * (بودجهٔ Lighthouse: ۰٫۹۵؛ اندازه‌گیری: ۰٫۹۳ روی `/en`).
 *
 * تست سطح HTML کامل (`npm run verify:rendering`) همان شرط را روی همهٔ ۵۶ صفحهٔ
 * پخته‌شده می‌سنجد؛ این تست در سطح کامپوننت است تا خطا هنگام توسعه دیده شود،
 * نه فقط در بیلد کامل.
 */

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const translate = (key: string) => `${namespace}.${key}`;
    return Object.assign(translate, { raw: () => [] });
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// three.js در jsdom معنا ندارد و هدف این تست سرصفحه است، نه کنواس.
vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

describe("Hero", () => {
  it("عنوان اصلی را با اولین رنگ‌آمیزی نشان می‌دهد (بدون opacity اولیه)", () => {
    render(<Hero />);

    const heading = screen.getByRole("heading", { level: 1 });

    // شرط اصلی: هیچ استایل inline ای که عنصر را نامرئی کند.
    expect(heading).not.toHaveAttribute("style", expect.stringContaining("opacity"));
    expect(heading.style.opacity).toBe("");
  });

  it("انیمیشن عنوان از کلاس CSS می‌آید، نه از مقدار اولیهٔ JS", () => {
    render(<Hero />);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading).toHaveClass("hero-enter");
    expect(heading).toHaveClass("hero-enter--rise");
    // مدت/تأخیر از متغیر CSS می‌آید (globals.css).
    expect(heading.style.getPropertyValue("--hero-duration")).toBe("700ms");
    expect(heading.style.getPropertyValue("--hero-delay")).toBe("80ms");
  });

  it("سه سطر عنوان و متن‌های فراخوان را رندر می‌کند", () => {
    render(<Hero />);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading.textContent).toContain("ui.hero.line1");
    expect(heading.textContent).toContain("ui.hero.accent");
    expect(heading.textContent).toContain("ui.hero.line3");
    expect(screen.getByRole("link", { name: /ui\.hero\.explore/ })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("link", { name: /ui\.hero\.start/ })).toHaveAttribute(
      "href",
      "/contact",
    );
  });

  it("بخش‌های تزئینی (نبض اسکرول ۳بعدی) بدون opacity اولیه رندر می‌شوند", () => {
    const { container } = render(<Hero />);

    // هیچ عنصری در hero نباید با استایل inline نامرئی شروع شود؛ انیمیشن‌ها
    // همه از کلاس‌های globals.css می‌آیند.
    const hidden = [...container.querySelectorAll<HTMLElement>("[style]")].filter((node) =>
      /opacity\s*:\s*0(?![.\d])/.test(node.getAttribute("style") ?? ""),
    );

    expect(hidden.map((node) => node.tagName)).toEqual([]);
  });
});
