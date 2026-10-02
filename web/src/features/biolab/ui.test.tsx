// @vitest-environment jsdom
/**
 * F-09 UI acceptance tests (§5 of the phase prompt):
 *  · the research/education disclaimer is really in the DOM;
 *  · `low-power` swaps the canvas for a *table* while keeping every number correct;
 *  · `balanced`/`full` render the canvas with the documented DPR;
 *  · invalid input gives a clear message instead of a crash;
 *  · the workbench keeps working when the API is off (tab 3 says so honestly);
 *  · tab 4 is sample-only and says it out loud.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/app/i18n";
import { Tool } from "@/features/biolab/Tool";
import { biolabCopy } from "@/features/biolab/copy";
import { REFERENCE_SAMPLE } from "@/features/biolab/data/reference";

const fa = biolabCopy.fa;

function renderTool() {
  return render(
    <MemoryRouter initialEntries={["/fa/biolab"]}>
      <Routes>
        <Route
          path="/:lang/biolab"
          element={
            <LanguageProvider>
              <Tool />
            </LanguageProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

/** The API is *off* in every test unless a case says otherwise: that is the offline contract. */
function mockApi({ configured = false }: { configured?: boolean } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify(configured ? { lab_samples_per_day: 120, lab_turnaround_hours: 24, lab_tests_per_sample: 4 } : {}), {
        status: configured ? 200 : 503,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

beforeEach(() => {
  mockApi();
  // jsdom has no canvas implementation; the viewer only needs the context to exist.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    measureText: () => ({ width: 10 }),
  })) as unknown as HTMLCanvasElement["getContext"];
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 640 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 220 });
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 3 });
  // jsdom ships no matchMedia; the tier detector needs it. Provide the same shape the browser has.
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }),
  });
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
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

async function analyseSample() {
  fireEvent.click(screen.getByRole("button", { name: fa.input.loadSample }));
  await waitFor(() => expect(screen.getByTestId("biolab-mode")).toBeTruthy(), { timeout: 5000 });
}

describe("F-09 · guards in the DOM", () => {
  it("shows the research/education disclaimer and the no-patient-data notice", async () => {
    renderTool();
    await analyseSample();
    expect(screen.getByText(fa.notices.disclaimer)).toBeTruthy();
    expect(screen.getByText(new RegExp(fa.notices.noPatientData.slice(0, 24)))).toBeTruthy();
    expect(screen.getByText(new RegExp(fa.notices.offlineOk.slice(0, 24)))).toBeTruthy();
  });

  it("reports illegal glyphs clearly instead of crashing", async () => {
    renderTool();
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: ">x\nACGTZQX" } });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Z|Q|X/);
    expect(screen.queryByTestId("biolab-mode")?.textContent ?? "").toBe("");
  });

  it("keeps working with the API off: tab 3 states it, tab 4 stays sample-only", async () => {
    renderTool();
    fireEvent.click(screen.getByRole("tab", { name: fa.tabs.pipeline }));
    await waitFor(() => expect(screen.getByText(fa.pipeline.offline)).toBeTruthy());
    expect(screen.getAllByText(fa.pipeline.notConfigured).length).toBeGreaterThan(0);
    expect(screen.queryByText(/[0-9]{2,}/, { selector: "p" })).toBeNull();

    // Without an analysis the FHIR tab offers the sample instead of inventing resources.
    fireEvent.click(screen.getByRole("tab", { name: fa.tabs.fhir }));
    expect(screen.getByText(new RegExp(fa.fhir.warning.slice(0, 20)))).toBeTruthy();
    expect(screen.queryByTestId("fhir-status")).toBeNull();

    // After a real analysis it builds Patient/Observation/Encounter from *that* result.
    await analyseSample();
    fireEvent.click(screen.getByRole("tab", { name: fa.tabs.fhir }));
    const status = await screen.findByTestId("fhir-status");
    expect(status.textContent).toBeTruthy();
    expect(screen.getByText("Patient")).toBeTruthy();
  });
});

describe("F-09 · viewer modes", () => {
  it("low-power renders a table, zero canvas, and still computes the reference numbers", async () => {
    window.localStorage.setItem("emmett:low-power", "true");
    mockApi();
    renderTool();
    await analyseSample();
    expect(screen.getByTestId("biolab-table-mode")).toBeTruthy();
    expect(screen.getByTestId("sequence-table")).toBeTruthy();
    expect(screen.queryByTestId("sequence-viewer")).toBeNull();
    expect(document.querySelector("canvas")).toBeNull();
    // The reference sample must still be computed exactly (spike CDS, 1273 aa ORF).
    const orfs = screen.getByLabelText(fa.results.orfTitle);
    expect(within(orfs).getByText(/1,273/)).toBeTruthy();
    expect(REFERENCE_SAMPLE.expectedLength).toBe(3822); // the sample itself is pinned
  });

  it("balanced renders the canvas with DPR 1", async () => {
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, get: () => 4 });
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, get: () => 4 });
    renderTool();
    await analyseSample();
    await waitFor(() => expect(screen.getByTestId("sequence-viewer")).toBeTruthy());
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    // The viewer paints in a rAF; wait for the frame instead of racing it.
    await waitFor(() => expect(canvas.width).toBe(640));
    expect(canvas.height).toBe(168);
  });

  it("full renders the taller interactive canvas, capped at DPR 2", async () => {
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, get: () => 8 });
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, get: () => 8 });
    renderTool();
    await analyseSample();
    await waitFor(() => expect(screen.getByTestId("sequence-viewer")).toBeTruthy());
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    await waitFor(() => expect(canvas.width).toBe(1280)); // 640 CSS px × min(devicePixelRatio 3, 2)
    expect(canvas.height).toBe(440); // 220 CSS px × 2 — the CSS box stays 220 (CLS rule)
    expect(canvas.style.height).toBe("220px");
  });
});
