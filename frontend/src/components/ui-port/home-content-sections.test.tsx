import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { AcademySection } from "./academy-section";
import { LibrarySection } from "./library-section";
import { ProductsSection } from "./products-section";
import { ProjectsSection } from "./projects-section";
import { ServicesSection } from "./services-section";

const translations: Record<string, string> = {
  "common.contentUnavailable": "Content is temporarily unavailable.",
  "services.empty": "No services found.",
  "projects.empty": "No published content found.",
  "blog.empty": "No articles found.",
  "academy.empty": "No courses found.",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const translate = (key: string) => translations[`${namespace}.${key}`] ?? `${namespace}.${key}`;
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

vi.mock("motion/react", async () => {
  const React = await import("react");
  const motion = new Proxy(
    {},
    {
      get: (_target, elementName: string) =>
        React.forwardRef<HTMLElement, Record<string, unknown> & { children?: ReactNode }>(
          function MotionElement({ children, ...props }, ref) {
            const domProps = Object.fromEntries(
              Object.entries(props).filter(
                ([key]) =>
                  !["initial", "animate", "whileInView", "transition", "viewport"].includes(key),
              ),
            );
            return React.createElement(elementName, { ...domProps, ref }, children as ReactNode);
          },
        ),
    },
  );
  return { motion };
});

const originalIntersectionObserver = globalThis.IntersectionObserver;

beforeAll(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterAll(() => {
  vi.stubGlobal("IntersectionObserver", originalIntersectionObserver);
});

function renderHomeSections(content: {
  services: Parameters<typeof ServicesSection>[0]["services"];
  products: Parameters<typeof ProductsSection>[0]["products"];
  projects: Parameters<typeof ProjectsSection>[0]["projects"];
  articles: Parameters<typeof LibrarySection>[0]["articles"];
  courses: Parameters<typeof AcademySection>[0]["courses"];
}) {
  return render(
    <>
      <ServicesSection services={content.services} />
      <ProductsSection products={content.products} />
      <ProjectsSection projects={content.projects} total={0} />
      <LibrarySection articles={content.articles} />
      <AcademySection courses={content.courses} />
    </>,
  );
}

describe("homepage content sections", () => {
  it("shows an explicit unavailable state and never substitutes illustrative content after API failure", () => {
    renderHomeSections({
      services: null,
      products: null,
      projects: null,
      articles: null,
      courses: null,
    });

    expect(screen.getAllByRole("status")).toHaveLength(5);
    expect(screen.getAllByText("Content is temporarily unavailable.")).toHaveLength(5);
    expect(
      screen.queryByText(
        /Athena Intelligence Platform|Meridian Supply Chain|LLM Throughput Analysis/,
      ),
    ).toBeNull();
    expect(screen.queryByText("Pentestor")).toBeNull();
    expect(screen.queryByText("Software Engineering")).toBeNull();
  });

  it("distinguishes a successful empty CMS response from an API error", () => {
    renderHomeSections({
      services: [],
      products: [],
      projects: [],
      articles: [],
      courses: [],
    });

    expect(screen.getByText("No services found.")).toBeInTheDocument();
    expect(screen.getAllByText("No published content found.")).toHaveLength(2);
    expect(screen.getByText("No articles found.")).toBeInTheDocument();
    expect(screen.getByText("No courses found.")).toBeInTheDocument();
    expect(screen.queryByText("Content is temporarily unavailable.")).toBeNull();
    expect(
      screen.queryByText(
        /Athena Intelligence Platform|Meridian Supply Chain|LLM Throughput Analysis/,
      ),
    ).toBeNull();
  });
});
