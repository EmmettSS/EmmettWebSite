import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FilterBar, SearchInputFilter } from "@/components/molecules/filter-bar";
import { Pagination } from "@/components/molecules/pagination";
import { buildCatalogApiQuery, useCatalogQuery } from "@/components/molecules/use-catalog-query";
import * as apiClient from "@/lib/api/client";
import type { Paginated } from "@/lib/api/types";

const pushMock = vi.fn();
let currentSearch = "";

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
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

function CatalogHookProbe({ initialData }: { initialData: Paginated<{ slug: string }> | null }) {
  const { data, isLoading } = useCatalogQuery<{ slug: string }>({
    endpointPath: "/services/",
    locale: "fa",
    initialData,
    mappings: [
      { urlParam: "category", apiParam: "categories__slug" },
      { urlParam: "featured", apiParam: "is_featured", onlyValue: "true" },
    ],
    fixedParams: { ordering: "order" },
  });
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="slugs">{(data?.results ?? []).map((i) => i.slug).join(",")}</span>
    </div>
  );
}

describe("Catalog molecules", () => {
  beforeEach(() => {
    pushMock.mockReset();
    currentSearch = "";
    vi.restoreAllMocks();
  });

  it("renders FilterBar options and updates URL params", () => {
    const { container, rerender } = render(
      <FilterBar label="Category" paramName="category" allLabel="All" options={[]} />,
    );
    expect(container.firstChild).toBeNull();

    currentSearch = "page=2";
    rerender(
      <FilterBar
        label="Category"
        paramName="category"
        allLabel="All"
        options={[
          { value: "security", label: "Security" },
          { value: "web", label: "Web" },
        ]}
      />,
    );

    expect(screen.getByText("Category")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Security" }));
    expect(pushMock).toHaveBeenCalledWith("/services?category=security");

    currentSearch = "category=security&featured=true";
    rerender(
      <FilterBar
        label=""
        paramName="category"
        allLabel="All"
        options={[{ value: "security", label: "Security" }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(pushMock).toHaveBeenLastCalledWith("/services?featured=true");

    currentSearch = "category=security";
    rerender(
      <FilterBar
        label=""
        paramName="category"
        allLabel="All"
        options={[{ value: "security", label: "Security" }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(pushMock).toHaveBeenLastCalledWith("/services");
  });

  it("handles SearchInputFilter Enter and blur updates", () => {
    currentSearch = "page=3";
    const { rerender } = render(<SearchInputFilter placeholder="Search items" label="Search" />);
    expect(screen.getByText("Search")).toBeInTheDocument();

    const input = screen.getByRole("searchbox", { name: "Search items" });
    fireEvent.change(input, { target: { value: "  pentest  " } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(pushMock).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(pushMock).toHaveBeenCalledWith("/services?search=pentest");

    currentSearch = "search=pentest";
    rerender(<SearchInputFilter placeholder="Search items" />);
    const updated = screen.getByRole("searchbox", { name: "Search items" });
    fireEvent.blur(updated);
    expect(pushMock).toHaveBeenCalledTimes(1);

    fireEvent.change(updated, { target: { value: "   " } });
    fireEvent.blur(updated);
    expect(pushMock).toHaveBeenLastCalledWith("/services");
  });

  it("renders Pagination links and boundary states", () => {
    const { container, rerender } = render(
      <Pagination currentPage={1} totalPages={1} basePath="/services" />,
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <Pagination
        currentPage={1}
        totalPages={3}
        basePath="/services"
        searchParams={{ category: "security", page: "1" }}
      />,
    );
    expect(screen.getByRole("navigation", { name: "label" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "previous" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "next" })).toHaveAttribute(
      "href",
      "/services?category=security&page=2",
    );
    expect(screen.getByText("1")).toHaveAttribute("aria-current", "page");

    rerender(<Pagination currentPage={3} totalPages={3} basePath="/services" />);
    expect(screen.getByRole("link", { name: "previous" })).toHaveAttribute(
      "href",
      "/services?page=2",
    );
    expect(screen.getByRole("button", { name: "next" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute("href", "/services");
  });

  it("builds catalog API queries and fetches filtered pages in useCatalogQuery", async () => {
    const emptyBuilt = buildCatalogApiQuery(
      new URLSearchParams("page=1&featured=false"),
      [{ urlParam: "featured", apiParam: "is_featured", onlyValue: "true" }],
      { is_product: "true" },
    );
    expect(emptyBuilt).toEqual({
      apiQuery: "is_product=true",
      filterParams: {},
      hasUserQuery: false,
    });

    const initial: Paginated<{ slug: string }> = {
      count: 1,
      total_pages: 1,
      current_page: 1,
      next: null,
      previous: null,
      results: [{ slug: "initial-service" }],
    };

    const fetchSpy = vi.spyOn(apiClient, "fetchCatalogPage");
    const { rerender } = render(<CatalogHookProbe initialData={initial} />);
    expect(screen.getByTestId("slugs")).toHaveTextContent("initial-service");
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockResolvedValueOnce({
      ...initial,
      results: [{ slug: "filtered-service" }],
    });
    currentSearch = "category=security&featured=true&page=2";
    rerender(<CatalogHookProbe initialData={initial} />);

    await waitFor(() => {
      expect(screen.getByTestId("slugs")).toHaveTextContent("filtered-service");
    });

    fetchSpy.mockRejectedValueOnce(new Error("network"));
    currentSearch = "category=broken";
    rerender(<CatalogHookProbe initialData={initial} />);

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("slugs")).toHaveTextContent("");
    });
  });
});
