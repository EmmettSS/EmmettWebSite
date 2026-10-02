/**
 * Visual layer rules that are verified statically (prompt §3.3, rules 1, 2 and the
 * "only TierScene may mount a scene" guard). The runtime rules (3–7) are covered by
 * `visuals.dom.test.tsx`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { SCENES, SCENE_FALLBACKS, SCENE_NAMES } from "@/visuals/registry";

const repo = path.resolve(__dirname, "..", "..");
const src = path.join(repo, "src");

function filesUnder(dir: string, extension = ".tsx"): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return filesUnder(full, extension);
    return full.endsWith(extension) || full.endsWith(".ts") ? [full] : [];
  });
}

describe("rule 1 · no 3D runtime in the bundle graph", () => {
  it("no source file imports three/fiber/drei", () => {
    const offenders = filesUnder(src).filter((file) => /from\s+"(three|@react-three\/[^"]+|@react-three\/drei)"/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
    const packageJson = JSON.parse(readFileSync(path.join(repo, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
    expect(Object.keys(packageJson.dependencies ?? {}).filter((name) => name === "three" || name.startsWith("@react-three"))).toEqual([]);
  });

  it("scenes are imported only by TierScene (the mandatory wrapper)", () => {
    const offenders = filesUnder(src).filter((file) => {
      if (file.endsWith("TierScene.tsx") || file.endsWith("registry.ts") || file.includes(".test.")) return false;
      const text = readFileSync(file, "utf8");
      return /from\s+"[^"]*visuals\/scenes\//.test(text) || /import\(\s*"[^"]*visuals\/scenes\//.test(text);
    });
    expect(offenders).toEqual([]);
  });
});

describe("rule 2 · every scene owns a pre-rendered fallback", () => {
  it("ships a fallback asset and a static component for each scene", () => {
    for (const name of SCENE_NAMES) {
      const asset = path.join(src, "visuals", "fallbacks", SCENES[name].fallbackFile);
      expect(statSync(asset).size, `${name} fallback asset`).toBeGreaterThan(200);
      const component = path.join(src, "visuals", "fallbacks", `${name}Static.tsx`);
      expect(statSync(component).size, `${name} static component`).toBeGreaterThan(200);
      expect(typeof SCENE_FALLBACKS[name], `${name} registered fallback component`).toBe("function");
    }
  });

  it("declares a minimum tier and a dynamic loader for every scene", async () => {
    for (const name of SCENE_NAMES) {
      expect(["balanced", "full"]).toContain(SCENES[name].minTier);
      const module = await SCENES[name].load();
      expect(typeof module.default).toBe("function"); // the scene is a lazy default export
    }
  });
});
