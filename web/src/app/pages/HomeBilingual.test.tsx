// @vitest-environment jsdom
/**
 * The home page may state what the team is building **only** when SiteConfig actually carries
 * that copy. Until then it must say so — never invent a project (MASTER §10, Phase 5 §2).
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/app/i18n";
import { HomeBilingual } from "@/app/pages/HomeBilingual";
import * as apiClient from "@/lib/api-client";

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/fa/"]}>
      <Routes>
        <Route
          path="/:lang/"
          element={
            <LanguageProvider>
              <HomeBilingual />
            </LanguageProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // framer-motion's in-view animations need an observer; jsdom has none.
  if (typeof IntersectionObserver === "undefined") {
    class StubIntersectionObserver {
      constructor(private callback: (entries: Array<{ isIntersecting: boolean; target: Element }>) => void) {}
      observe(target: Element) {
        this.callback([{ isIntersecting: true, target }]);
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", StubIntersectionObserver as unknown as typeof IntersectionObserver);
  }
  if (typeof window.matchMedia !== "function") {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("home · what we are building now (SiteConfig)", () => {
  it("says the line is pending when no approved copy exists", async () => {
    vi.spyOn(apiClient, "apiGet").mockResolvedValue({
      brand_fa: "امت",
      brand_en: "Emmett",
      telegram_handle: "",
      building_fa: "",
      building_en: "",
      lab_samples_per_day: null,
      lab_turnaround_hours: null,
      lab_tests_per_sample: null,
    });
    renderHome();
    const band = await screen.findByTestId("building-now");
    await waitFor(() => expect(band.getAttribute("data-state")).toBe("pending"));
    expect(band.textContent).toContain("[INPUT B6]");
  });

  it("shows the configured copy verbatim and marks the band configured", async () => {
    vi.spyOn(apiClient, "apiGet").mockResolvedValue({
      brand_fa: "امت",
      brand_en: "Emmett",
      telegram_handle: "emmett_lab",
      building_fa: "نسخهٔ دوم موتور جست‌وجوی حقوقی را می‌سازیم.",
      building_en: "We are building the second version of the legal search engine.",
      lab_samples_per_day: 240,
      lab_turnaround_hours: 36,
      lab_tests_per_sample: 8,
    });
    renderHome();
    const band = await screen.findByTestId("building-now");
    await waitFor(() => expect(band.getAttribute("data-state")).toBe("configured"));
    expect(band.textContent).toContain("نسخهٔ دوم موتور جست‌وجوی حقوقی را می‌سازیم.");
    expect(band.textContent).not.toContain("[INPUT B6]");
  });

  it("stays honest when the API is unavailable", async () => {
    vi.spyOn(apiClient, "apiGet").mockRejectedValue(new apiClient.ApiError(0, "network", "خارج از دسترس", "offline"));
    renderHome();
    const band = await screen.findByTestId("building-now");
    await waitFor(() => expect(band.getAttribute("data-state")).toBe("unavailable"));
    expect(band.textContent).toContain("[INPUT B6]");
  });
});
