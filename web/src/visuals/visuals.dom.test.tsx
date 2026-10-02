// @vitest-environment jsdom
/**
 * Runtime rules 3–7 of §3.3, verified with a mocked IntersectionObserver, a manual
 * requestAnimationFrame scheduler and a controllable device tier.
 */
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/app/i18n";
import { HeroSystemStatic } from "@/visuals/fallbacks/HeroSystemStatic";
import { TierScene } from "@/visuals/TierScene";

/* ---------------------------------------------------------------- harness */

type ObserverCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  private callback: ObserverCallback;
  constructor(callback: ObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  trigger(isIntersecting: boolean, target: Element) {
    this.callback([{ isIntersecting, target }]);
  }
}

/** A faithful requestAnimationFrame scheduler: callbacks can be cancelled, like the browser. */
const pendingFrames = new Map<number, (time: number) => void>();
let clock = 0;
let rafIds = 0;

function runFrames(count: number, stepMs = 60) {
  for (let index = 0; index < count; index += 1) {
    const batch = [...pendingFrames.entries()];
    pendingFrames.clear();
    clock += stepMs;
    for (const [, callback] of batch) callback(clock);
  }
}

const fakeContext = {
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  createLinearGradient: () => ({ addColorStop: vi.fn() }),
  createRadialGradient: () => ({ addColorStop: vi.fn() }),
  globalAlpha: 1,
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
  font: "",
};

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  pendingFrames.clear();
  clock = 0;
  rafIds = 0;
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver as unknown as typeof IntersectionObserver);
  vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) => {
    rafIds += 1;
    pendingFrames.set(rafIds, callback);
    return rafIds;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    pendingFrames.delete(id);
  });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  Object.defineProperty(window, "matchMedia", { writable: true, value: globalThis.matchMedia });
  Object.defineProperty(window, "devicePixelRatio", { writable: true, configurable: true, value: 3 });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 400 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 320 });
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeContext) as unknown as HTMLCanvasElement["getContext"];
  window.localStorage.clear();
  Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, get: () => 8 });
  Object.defineProperty(navigator, "deviceMemory", { configurable: true, get: () => 8 });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

/** Scenes live inside the app shell: language provider + router, exactly like production. */
function renderScene(props: Partial<Parameters<typeof TierScene>[0]> = {}) {
  const { container } = render(
    <MemoryRouter initialEntries={["/fa/"]}>
      <Routes>
        <Route
          path="/:lang/*"
          element={
            <LanguageProvider>
              <TierScene scene="HeroSystem" fallback={<HeroSystemStatic />} height={320} {...props} />
            </LanguageProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  const root = container.querySelector("[data-tier-scene]") as HTMLElement;
  return { container, root };
}

async function forceLowPower() {
  window.localStorage.setItem("emmett:low-power", "true");
}

/* ------------------------------------------------------------------ rules */

describe("rule 3 · nothing starts before it is in the viewport", () => {
  it("renders a placeholder (no canvas) until the observer reports intersection", async () => {
    const { root } = renderScene();
    await waitFor(() => expect(MockIntersectionObserver.instances.length).toBeGreaterThan(0));
    expect(root.dataset.sceneActive).toBe("false");
    expect(root.querySelector("canvas")).toBeNull();
    expect(root.querySelector("[data-scene-placeholder]")).not.toBeNull();

    const observer = MockIntersectionObserver.instances[0];
    await act(async () => {
      observer.trigger(true, root);
    });
    await waitFor(() => expect(root.querySelector("canvas")).not.toBeNull());
    expect(root.dataset.sceneActive).toBe("true");
  });

  it("with pauseOffscreen=false starts immediately", async () => {
    const { root } = renderScene({ pauseOffscreen: false });
    await waitFor(() => expect(root.querySelector("canvas")).not.toBeNull());
  });
});

describe("rule 4 · DPR is capped", () => {
  it("full tier caps the device pixel ratio at 2", async () => {
    const { root } = renderScene({ pauseOffscreen: false });
    await waitFor(() => expect(root.querySelector("canvas")).not.toBeNull());
    const canvas = root.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas.width).toBe(800); // 400 CSS px × min(devicePixelRatio 3, 2)
    expect(window.devicePixelRatio).toBe(3);
  });

  it("balanced tier forces DPR 1", async () => {
    Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, get: () => 4 });
    Object.defineProperty(navigator, "deviceMemory", { configurable: true, get: () => 4 });
    const { root } = renderScene({ pauseOffscreen: false });
    await waitFor(() => expect(root.dataset.sceneTier).toBe("balanced"));
    await waitFor(() => expect(root.querySelector("canvas")).not.toBeNull());
    const canvas = root.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas.width).toBe(400);
  });
});

describe("rule 5 · low-power renders zero canvas", () => {
  it("uses the fallback and never mounts a scene", async () => {
    await forceLowPower();
    const { root } = renderScene({ pauseOffscreen: false });
    await waitFor(() => expect(root.dataset.sceneTier).toBe("low-power"));
    expect(root.querySelector("canvas")).toBeNull();
    expect(root.querySelector("[data-scene-fallback]")).not.toBeNull();
    // The fallback keeps the meaning and the links: five capability nodes, five evidence links.
    expect(screen.getAllByRole("link").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText("فرانت‌اند")).toBeTruthy();
  });
});

describe("rule 6 · scenes cannot shift layout (CLS-safe)", () => {
  it("reserves a fixed height and never mutates the container box", async () => {
    const { root } = renderScene({ pauseOffscreen: false, height: 280 });
    const before = root.style.cssText;
    await waitFor(() => expect(root.querySelector("canvas")).not.toBeNull());
    await act(async () => runFrames(6));
    expect(root.style.height).toBe("280px");
    expect(root.style.contain).toBe("layout paint");
    expect(root.style.cssText).toBe(before);
  });
});

describe("rule 7 · the render loop stops outside the viewport", () => {
  it("stops drawing when the observer reports the scene left the viewport", async () => {
    const { root } = renderScene();
    await waitFor(() => expect(MockIntersectionObserver.instances.length).toBeGreaterThan(0));
    const observer = MockIntersectionObserver.instances[0];
    await act(async () => {
      observer.trigger(true, root);
    });
    await waitFor(() => expect(root.querySelector("canvas")).not.toBeNull());
    const canvas = root.querySelector("canvas") as HTMLCanvasElement;

    await act(async () => runFrames(4));
    const drawn = Number(canvas.dataset.sceneFrames ?? "0");
    expect(drawn).toBeGreaterThan(0);

    await act(async () => {
      observer.trigger(false, root);
    });
    await waitFor(() => expect(root.dataset.sceneActive).toBe("false"));
    await act(async () => runFrames(6));
    const after = Number(canvas.dataset.sceneFrames ?? "0");
    expect(after).toBe(drawn); // no further frames reached the canvas
    expect(pendingFrames.size).toBe(0); // and the loop was cancelled, not merely idle
  });
});
