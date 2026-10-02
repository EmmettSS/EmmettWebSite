/** F-11 acceptance tests: three scenarios → three structurally different diagrams; every claim traceable. */
import { describe, expect, it } from "vitest";
import { ALL_NODES, NODE_LABELS, diagramSize, layout, recommend, tomanRangeOf, type Answers } from "./rules";

const scenarios: Record<string, Answers> = {
  internalTool: { kind: "internal_tool", scale: "pilot", constraints: ["cpanel_hosting", "team_size"] },
  portal: { kind: "customer_portal", scale: "growing", constraints: ["budget"] },
  ai: { kind: "ai_assistant", scale: "high_traffic", constraints: ["compliance", "offline_first"] },
};

describe("F-11 · rules graph", () => {
  it("produces three structurally different diagrams for three scenarios", () => {
    const results = Object.values(scenarios).map(recommend);
    const signatures = results.map((result) => `${[...result.nodes].sort().join(",")}|${result.edges.map((edge) => `${edge.from}>${edge.to}`).sort().join(",")}`);
    expect(new Set(signatures).size).toBe(3);
  });

  it("keeps every edge inside the node set and every node drawable", () => {
    for (const scenario of Object.values(scenarios)) {
      const result = recommend(scenario);
      for (const node of result.nodes) expect(ALL_NODES).toContain(node);
      for (const edge of result.edges) {
        expect(result.nodes).toContain(edge.from);
        expect(result.nodes).toContain(edge.to);
      }
      const positions = layout(result.nodes, result.edges);
      expect(Object.keys(positions)).toHaveLength(result.nodes.length);
      const size = diagramSize(result.nodes);
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    }
  });

  it("states a reason for every modifier it applies", () => {
    const result = recommend(scenarios.ai);
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
    for (const reason of result.reasons) {
      expect(reason.fa.length).toBeGreaterThan(10);
      expect(reason.en.length).toBeGreaterThan(10);
    }
  });

  it("matches the persisted sample: the assistant profile calls a model only behind retrieval", () => {
    const result = recommend(scenarios.ai);
    expect(result.nodes).toContain("vector");
    expect(result.nodes).toContain("llm");
    expect(result.edges.some((edge) => edge.from === "vector" && edge.to === "llm")).toBe(true);
    expect(result.risks.some((risk) => risk.en.includes("ceiling"))).toBe(true);
  });

  it("labels every node bilingually", () => {
    for (const node of ALL_NODES) {
      expect(NODE_LABELS[node].fa.length).toBeGreaterThan(1);
      expect(NODE_LABELS[node].en.length).toBeGreaterThan(1);
    }
  });
});

describe("F-11 · versioned cost table", () => {
  it("walks the published person-week bands instead of a single hardcoded price", () => {
    expect(tomanRangeOf("ai_assistant")).toEqual({ weeks: [4, 10], toman: [4 * 24_000_000, 10 * 44_000_000] });
    expect(tomanRangeOf("internal_tool")!.toman[0]).toBeLessThan(tomanRangeOf("regulated_system")!.toman[1]);
  });
});
