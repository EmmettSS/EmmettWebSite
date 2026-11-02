import { render, screen } from "@testing-library/react";
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

vi.mock("next-intl", () => ({
  useLocale: () => "fa",
  useTranslations: () => (key: string) => key,
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
});
