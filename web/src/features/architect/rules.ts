/**
 * F-11 — the recommendation engine.
 *
 * A rules graph, not a fixed template: each answer selects nodes, and the composition of nodes
 * is what produces the diagram, the stack, the risks and the time band. Two different answers
 * therefore always produce two structurally different diagrams (asserted by the tests).
 */
export type SystemKind = "internal_tool" | "customer_portal" | "data_platform" | "ai_assistant" | "regulated_system";
export type Scale = "pilot" | "growing" | "high_traffic";
export type Constraint = "budget" | "cpanel_hosting" | "deadline" | "compliance" | "offline_first" | "team_size";

export type Answers = {
  kind: SystemKind;
  scale: Scale;
  constraints: Constraint[];
};

export type StackChoice = { layer: { fa: string; en: string }; choice: { fa: string; en: string }; why: { fa: string; en: string } };
export type Risk = { fa: string; en: string };

export type NodeId =
  | "client"
  | "api"
  | "auth"
  | "queue"
  | "worker"
  | "db"
  | "cache"
  | "search"
  | "llm"
  | "vector"
  | "audit"
  | "cdn";

export type Edge = { from: NodeId; to: NodeId; label?: { fa: string; en: string } };

import { tomanRange, type CostBand } from "./config";

export type Recommendation = {
  nodes: NodeId[];
  edges: Edge[];
  stack: StackChoice[];
  risks: Risk[];
  profile: SystemKind;
  /** Media queries / decisions that produced this graph, shown to the user (Show Your Work). */
  reasons: { fa: string; en: string }[];
};

export const NODE_LABELS: Record<NodeId, { fa: string; en: string }> = {
  client: { fa: "کلاینت وب/موبایل", en: "Web/mobile client" },
  api: { fa: "سرویس API", en: "API service" },
  auth: { fa: "احراز هویت", en: "Authentication" },
  queue: { fa: "صف کار", en: "Job queue" },
  worker: { fa: "اجراکنندهٔ کار", en: "Job worker" },
  db: { fa: "پایگاه داده", en: "Database" },
  cache: { fa: "کش", en: "Cache" },
  search: { fa: "جست‌وجو", en: "Search" },
  llm: { fa: "مدل زبانی", en: "Language model" },
  vector: { fa: "ایندکس برداری", en: "Vector index" },
  audit: { fa: "لاگ حسابرسی", en: "Audit log" },
  cdn: { fa: "CDN/لبه", en: "CDN/edge" },
};

export const ALL_NODES: NodeId[] = Object.keys(NODE_LABELS) as NodeId[];

export function recommend(answers: Answers): Recommendation {
  const nodes = new Set<NodeId>(["client", "api", "db"]);
  const edges: Edge[] = [
    { from: "client", to: "api", label: { fa: "HTTPS", en: "HTTPS" } },
    { from: "api", to: "db", label: { fa: "خواندن/نوشتن", en: "read/write" } },
  ];
  const stack: StackChoice[] = [];
  const risks: Risk[] = [];
  const reasons: { fa: string; en: string }[] = [];

  const add = (node: NodeId) => nodes.add(node);
  const edge = (from: NodeId, to: NodeId, label?: Edge["label"]) => {
    if (!edges.some((existing) => existing.from === from && existing.to === to)) edges.push({ from, to, label });
  };

  // Kind drives the core shape.
  if (answers.kind === "internal_tool") {
    add("auth");
    edge("api", "auth");
    reasons.push({ fa: "ابزار داخلی: ورود کاربران سازمانی و نقش‌ها", en: "Internal tool: organisational login and roles" });
    stack.push({ layer: { fa: "لایهٔ داده", en: "Data layer" }, choice: { fa: "PostgreSQL روی همان میزبان", en: "PostgreSQL on the same host" }, why: { fa: "حجم و الگوی دسترسی کوچک است؛ عملیات ساده می‌ماند", en: "Small volume and access pattern; keeps operations simple" } });
  }

  if (answers.kind === "customer_portal") {
    add("auth");
    add("cdn");
    edge("client", "cdn");
    edge("api", "auth");
    reasons.push({ fa: "پورتال مشتری: ورود عمومی + تحویل محتوا از لبه", en: "Customer portal: public login + edge delivery" });
    stack.push({ layer: { fa: "احراز هویت", en: "Auth" }, choice: { fa: "نشست کوکی‌محور با توکن کوتاه‌عمر", en: "Cookie sessions with short-lived tokens" }, why: { fa: "سطح حملهٔ توکن در مرورگر را کم می‌کند", en: "Reduces token exposure in the browser" } });
  }

  if (answers.kind === "data_platform") {
    add("queue");
    add("worker");
    add("search");
    edge("api", "queue");
    edge("queue", "worker");
    edge("worker", "db");
    edge("api", "search", { fa: "جست‌وجوی تحلیلی", en: "analytical search" });
    reasons.push({ fa: "پلتفرم داده: پردازش ناهمزمان و جست‌وجوی تحلیلی", en: "Data platform: asynchronous processing and analytical search" });
    stack.push({ layer: { fa: "پردازش", en: "Processing" }, choice: { fa: "کارهای زمان‌بندی‌شده + صف پایدار", en: "Scheduled jobs + durable queue" }, why: { fa: "بار سنگین نباید کاربر را منتظر بگذارد", en: "Heavy work must not make users wait" } });
  }

  if (answers.kind === "ai_assistant") {
    add("llm");
    add("vector");
    add("queue");
    edge("api", "vector", { fa: "بازیابی", en: "retrieval" });
    edge("api", "llm", { fa: "فقط با استناد", en: "only with citations" });
    edge("vector", "llm");
    reasons.push({ fa: "دستیار: بازیابی محلی + فراخوانی مدل فقط پس از آستانه", en: "Assistant: local retrieval + model call only above threshold" });
    stack.push({ layer: { fa: "هوش مصنوعی", en: "AI" }, choice: { fa: "BM25 محلی + provider قابل تعویض", en: "Local BM25 + swappable provider" }, why: { fa: "هزینهٔ صفر در حالت پایه و خروجی همیشه با ارجاع", en: "Zero baseline cost and every answer carries a citation" } });
    risks.push({ fa: "هزینهٔ مدل زبانی باید سقف روزانه داشته باشد", en: "Model cost needs a hard daily ceiling" });
  }

  if (answers.kind === "regulated_system") {
    add("audit");
    add("auth");
    edge("api", "audit");
    reasons.push({ fa: "سامانهٔ تنظیم‌شده: لاگ حسابرسی و کنترل دسترسی", en: "Regulated system: audit trail and access control" });
    risks.push({ fa: "افشای داده و الزام نگهداری لاگ باید پیش از طراحی روشن شود", en: "Data disclosure and log retention must be settled before design" });
  }

  // Scale modifiers.
  if (answers.scale === "growing") {
    add("cache");
    edge("api", "cache");
    reasons.push({ fa: "رشد: کش لایهٔ خواندن برای کاهش فشار پایگاه داده", en: "Growing: read cache to relieve the database" });
  }
  if (answers.scale === "high_traffic") {
    add("cache");
    add("cdn");
    edge("api", "cache");
    edge("client", "cdn");
    reasons.push({ fa: "ترافیک بالا: کش + لبه برای تحمل بار اوج", en: "High traffic: cache + edge to absorb peaks" });
    risks.push({ fa: "بدون اندازه‌گیری واقعی، ظرفیت حدس است؛ بارسنجی لازم است", en: "Without real measurement, capacity is a guess; load testing is required" });
  }

  // Constraint modifiers.
  if (answers.constraints.includes("cpanel_hosting")) {
    reasons.push({ fa: "قید میزبانی: معماری باید در پوشش cPanel قابل اجرا بماند (بدون سرویس سنگین دائم)", en: "Hosting constraint: the architecture must fit the cPanel envelope (no always-on heavy service)" });
    stack.push({ layer: { fa: "اجرا", en: "Runtime" }, choice: { fa: "Django + cron روی Passenger (پوشش cPanel)", en: "Django + cron on Passenger (cPanel envelope)" }, why: { fa: "همان الگویی که در همین سایت اجرا و تست شده است", en: "The same pattern this site runs and tests" } });
    risks.push({ fa: "کار سنگین باید به cron منتقل شود، نه درخواست کاربر", en: "Heavy work must move to cron, never into a user request" });
  }
  if (answers.constraints.includes("budget")) {
    reasons.push({ fa: "قید بودجه: گزینه‌های مدیریت‌شده و هزینهٔ ثابت ترجیح داده شد", en: "Budget constraint: managed options with fixed cost were preferred" });
    stack.push({ layer: { fa: "زیرساخت", en: "Infrastructure" }, choice: { fa: "تک‌میزبان با یک پایگاه داده", en: "Single host with one database" }, why: { fa: "ساده‌ترین چیزی که تا رشد واقعی پاسخ می‌دهد", en: "The simplest thing that holds until real growth" } });
  }
  if (answers.constraints.includes("deadline")) {
    reasons.push({ fa: "قید زمان: دامنه به یک مسیر انتها‌به‌انتها بریده می‌شود", en: "Deadline constraint: scope is cut to one end-to-end path" });
    risks.push({ fa: "اگر دامنه بریده نشود، بدهی فنی می‌ماند", en: "If scope is not cut, technical debt is what remains" });
  }
  if (answers.constraints.includes("compliance")) {
    add("audit");
    edge("api", "audit");
    reasons.push({ fa: "قید انطباق: مسیر حسابرسی و تفکیک دسترسی", en: "Compliance constraint: audit path and separated access" });
  }
  if (answers.constraints.includes("offline_first")) {
    add("client");
    reasons.push({ fa: "کار در شرایط اتصال ضعیف: منطق سنگین در مرورگر", en: "Weak-connectivity work: heavy logic in the browser" });
    stack.push({ layer: { fa: "محاسبه", en: "Compute" }, choice: { fa: "منطق خالص در کلاینت + worker", en: "Pure logic in the client + worker" }, why: { fa: "مثل میز کار بیوانفورماتیک همین سایت، بدون رفت‌وبرگشت شبکه", en: "Like this site's bio workbench: no network round-trips" } });
  }
  if (answers.constraints.includes("team_size")) {
    reasons.push({ fa: "اندازهٔ تیم: قطعات کمتر و مستندتر، نگهداری بلندمدت را ممکن می‌کند", en: "Team size: fewer, better-documented parts make long-term maintenance possible" });
  }

  // The engine itself is always recommended with its reasons.
  stack.push({ layer: { fa: "بک‌اند", en: "Backend" }, choice: { fa: "Django + DRF با allow-list و throttle", en: "Django + DRF with allow-lists and throttling" }, why: { fa: "همان الگوی آزموده‌شدهٔ این سایت؛ روی cPanel اجرا می‌شود", en: "This site's own tested pattern; runs on cPanel" } });

  return { nodes: [...nodes], edges, stack, risks, profile: answers.kind, reasons };
}

/** Deterministic layout so the same answers always draw the same diagram (and tests can diff). */
export function layout(nodes: NodeId[], edges: Edge[]): Record<string, { x: number; y: number }> {
  const columns = Math.max(2, Math.ceil(Math.sqrt(nodes.length)));
  const positions: Record<string, { x: number; y: number }> = {};
  // Order nodes by dependency depth so arrows flow left→right.
  const depth = new Map<NodeId, number>(nodes.map((node) => [node, 0]));
  for (let pass = 0; pass < nodes.length; pass += 1) {
    for (const edge of edges) {
      const next = Math.min(nodes.length, (depth.get(edge.from) ?? 0) + 1);
      if (next > (depth.get(edge.to) ?? 0)) depth.set(edge.to, next);
    }
  }
  const byDepth = [...nodes].sort((a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0) || a.localeCompare(b));
  byDepth.forEach((node, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    positions[node] = { x: 60 + column * 180, y: 60 + row * 110 };
  });
  return positions;
}

export function diagramSize(nodes: NodeId[]): { width: number; height: number } {
  const columns = Math.max(2, Math.ceil(Math.sqrt(nodes.length)));
  const rows = Math.ceil(nodes.length / columns);
  return { width: 60 + columns * 180, height: 60 + rows * 110 };
}

/** Thin alias so the advisor reads naturally: the numbers always come from `config.ts`. */
export function tomanRangeOf(profile: SystemKind): { weeks: [number, number]; toman: [number, number] } | null {
  return tomanRange(profile);
}

export type { CostBand };
