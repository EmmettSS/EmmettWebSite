import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchResponse } from "@/lib/api/types";

import { CommandPalette, type PaletteItem } from "./command-palette";

const pushMock = vi.fn();
const searchMock = vi.fn<(query: string, locale: string) => Promise<SearchResponse>>();

vi.mock("next-intl", () => ({
  useLocale: () => "fa",
  useTranslations: () => {
    const translator = (key: string, values?: { query?: string }) =>
      values?.query ? `${key}:${values.query}` : key;
    return Object.assign(translator, { raw: () => [] });
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/api/client", () => ({
  globalSearch: (query: string, locale: string) => searchMock(query, locale),
}));

const ITEMS: PaletteItem[] = [
  { label: "خانه", category: "صفحه", href: "/" },
  { label: "خدمات — سیستم مهندسی", category: "صفحه", href: "/services" },
  { label: "CRM — سیستم‌های کسب‌وکار", category: "محصول", href: "/products/crm" },
];

const API_RESULT: SearchResponse = {
  query: "dj",
  locale: "fa",
  count: 1,
  results: [
    {
      content_type: "course",
      public_id: "course-1",
      title: "ساخت API با جنگو",
      url_path: "/academy/django-rest-api",
      category_label: "دوره",
      rank: 1,
    },
  ],
};

function renderPalette(onClose = vi.fn()) {
  return render(
    <div className="ui-shell">
      <main id="main-content">
        <a href="#content">content</a>
      </main>
      <CommandPalette open items={ITEMS} onClose={onClose} />
    </div>,
  );
}

function queryInput() {
  return screen.getByPlaceholderText("searchPlaceholder");
}

describe("CommandPalette", () => {
  beforeEach(() => {
    pushMock.mockReset();
    searchMock.mockReset();
    searchMock.mockResolvedValue({ query: "", locale: "fa", count: 0, results: [] });
  });

  it("renders the static page list and filters it without calling the API below two characters", async () => {
    renderPalette();

    expect(screen.getByRole("option", { name: /CRM/ })).toBeInTheDocument();

    fireEvent.change(queryInput(), { target: { value: "C" } });
    expect(screen.getByRole("option", { name: /CRM/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /خدمات/ })).not.toBeInTheDocument();

    // کمتر از دو نویسه یعنی هنوز آستانهٔ API نرسیده است.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("searches the backend FTS after debounce and navigates to the chosen API result", async () => {
    searchMock.mockResolvedValue(API_RESULT);
    const onClose = vi.fn();
    renderPalette(onClose);

    fireEvent.change(queryInput(), { target: { value: "dj" } });
    // debounce: هنوز صدا زده نشده است.
    expect(searchMock).not.toHaveBeenCalled();

    const result = await screen.findByRole("option", { name: /ساخت API با جنگو/ });
    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock).toHaveBeenCalledWith("dj", "fa");
    expect(screen.getByText("resultsHeading")).toBeInTheDocument();

    fireEvent.click(result);
    expect(pushMock).toHaveBeenCalledWith("/academy/django-rest-api");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a loading state while the search request is in flight", async () => {
    let resolveSearch: (value: SearchResponse) => void = () => {};
    searchMock.mockReturnValue(
      new Promise<SearchResponse>((resolve) => {
        resolveSearch = resolve;
      }),
    );
    renderPalette();

    fireEvent.change(queryInput(), { target: { value: "dj" } });
    await waitFor(() => expect(searchMock).toHaveBeenCalled());
    expect(screen.getByText("searching")).toBeInTheDocument();

    resolveSearch(API_RESULT);
    expect(await screen.findByRole("option", { name: /ساخت API با جنگو/ })).toBeInTheDocument();
    expect(screen.queryByText("searching")).not.toBeInTheDocument();
  });

  it("keeps page results usable and reports the error when the API search fails", async () => {
    searchMock.mockRejectedValue(new Error("network"));
    renderPalette();

    fireEvent.change(queryInput(), { target: { value: "CRM" } });

    expect(await screen.findByText("searchError")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /CRM — سیستم‌های کسب‌وکار/ })).toBeInTheDocument();
  });

  it("ignores a stale response that resolves after a newer query", async () => {
    let resolveStale: (value: SearchResponse) => void = () => {};
    searchMock.mockImplementation((query: string) =>
      query === "dj"
        ? new Promise<SearchResponse>((resolve) => {
            resolveStale = resolve;
          })
        : Promise.resolve({
            query,
            locale: "fa",
            count: 1,
            results: [
              {
                content_type: "service",
                public_id: "svc-1",
                title: "نتیجهٔ تازه",
                url_path: "/services/web-development",
                category_label: "خدمت",
                rank: 1,
              },
            ],
          }),
    );
    renderPalette();

    fireEvent.change(queryInput(), { target: { value: "dj" } });
    await waitFor(() => expect(searchMock).toHaveBeenCalledWith("dj", "fa"));

    fireEvent.change(queryInput(), { target: { value: "dja" } });
    expect(await screen.findByRole("option", { name: /نتیجهٔ تازه/ })).toBeInTheDocument();

    resolveStale(API_RESULT);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("option", { name: /ساخت API با جنگو/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /نتیجهٔ تازه/ })).toBeInTheDocument();
  });

  it("supports arrow-key navigation and Enter from both the input and a row", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPalette(onClose);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(queryInput()).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /خانه/ })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /خدمات/ })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(pushMock).toHaveBeenCalledWith("/services");
    expect(onClose).toHaveBeenCalled();
  });

  it("activates the first row when Enter is pressed in the input", async () => {
    const user = userEvent.setup();
    renderPalette();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(queryInput()).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("offers viewing all results on the /search page for the current query", async () => {
    const onClose = vi.fn();
    renderPalette(onClose);

    fireEvent.change(queryInput(), { target: { value: "django rest" } });
    const viewAll = await screen.findByRole("button", { name: /viewAllResults:django rest/ });
    fireEvent.click(viewAll);

    expect(pushMock).toHaveBeenCalledWith("/search?q=django%20rest");
    expect(onClose).toHaveBeenCalled();
  });

  it("stays inside the shell (no portal), carries its token background, and keeps the page inert", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPalette(onClose);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const dialog = screen.getByRole("dialog");
    // قفل قید Portal در ADR-0037: پالت داخل درخت پوسته می‌ماند و رنگ توکنی
    // خودش را صریح دارد؛ main پشت آن inert است و Escape به onClose می‌رسد.
    expect(dialog.closest(".ui-shell")).not.toBeNull();
    expect(dialog).toHaveStyle({ background: "rgba(11,31,24,0.98)" });
    expect(document.getElementById("main-content")).toHaveAttribute("inert");
    expect(queryInput()).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
