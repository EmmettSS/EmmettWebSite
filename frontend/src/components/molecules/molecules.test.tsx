import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { Breadcrumb } from "@/components/molecules/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardMedia,
  CardTitle,
} from "@/components/molecules/card";
import { FadeIn } from "@/components/molecules/fade-in";
import { LocaleSwitcher } from "@/components/molecules/locale-switcher";
import { ThemeToggle } from "@/components/molecules/theme-toggle";

const setThemeMock = vi.fn();

vi.mock("next-intl", () => ({
  useLocale: () => "fa",
  useTranslations: () => (key: string) => key,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: setThemeMock }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/services",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Molecules", () => {
  it("renders full Card composition", () => {
    render(
      <Card>
        <CardMedia>Media</CardMedia>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("renders Breadcrumb with links and current page marker", () => {
    render(
      <Breadcrumb
        items={[
          { label: "خانه", href: "/" },
          { label: "خدمات", href: "/services" },
          { label: "توسعه وب" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "خانه" })).toHaveAttribute("href", "/");
    expect(screen.getByText("توسعه وب")).toHaveAttribute("aria-current", "page");
  });

  it("renders FadeIn on mount and view", () => {
    render(
      <div>
        <FadeIn on="mount">Mount Content</FadeIn>
        <FadeIn on="view" delay={0.1}>
          View Content
        </FadeIn>
      </div>,
    );

    expect(screen.getByText("Mount Content")).toBeInTheDocument();
    expect(screen.getByText("View Content")).toBeInTheDocument();
  });

  it("renders LocaleSwitcher and ThemeToggle", () => {
    render(
      <div>
        <LocaleSwitcher />
        <ThemeToggle />
      </div>,
    );

    expect(screen.getByRole("group", { name: "switchLabel" })).toBeInTheDocument();
    const toggleBtn = screen.getByRole("button", { name: "toggleLabel" });
    fireEvent.click(toggleBtn);
    expect(setThemeMock).toHaveBeenCalledWith("light");
  });
});
