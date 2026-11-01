#!/usr/bin/env node
/**
 * اندازه‌گیری کارایی صفحه‌ها روی یک نمونهٔ در حال اجرا (ADR-0041).
 *
 * چرا این فایل وجود دارد؟ مستندات این پروژه قبلاً اعدادی داشت که هیچ دستوری
 * برای بازتولیدشان نبود. از این پس هر عدد در `docs/audit/` باید با این اسکریپت
 * گرفته شود:
 *
 *   make bench                 # روی http://127.0.0.1:3000
 *   BASE_URL=http://host:3000 node scripts/measure-perf.mjs
 *
 * خروجی: TTFB (تا رسیدن هدرها، مثل `curl -w %{time_starttransfer}`) برای
 * درخواست‌های متوالی و هم‌زمان، حجم HTML خام و gzip، و حجم JS اولیهٔ هر صفحه.
 * هیچ وابستگی خارجی ندارد.
 *
 * چرا `fetch` استفاده نمی‌شود؟ چون undici سربار و سقف اتصال خودش را اضافه
 * می‌کند و اعداد هم‌زمان را مصنوعاً بالا می‌برد (اندازه‌گیری‌شده: ۳۰ms در
 * برابر ۴٫۸ms با curl). اینجا با `node:http` و یک Agent با `maxSockets` برابر
 * درجهٔ هم‌زمانی اندازه می‌گیریم تا عدد به TTFB واقعی سرور نزدیک باشد.
 */
import { Agent, request } from "node:http";
import { gzipSync } from "node:zlib";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const PAGES = (process.env.PAGES ?? "/,/en,/services,/blog,/projects").split(",");
const SEQ_SAMPLES = Number(process.env.SEQ_SAMPLES ?? 30);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 10);

const baseUrl = new URL(BASE);
const agent = new Agent({ keepAlive: true, maxSockets: CONCURRENCY });

const kb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  return { mean, p50: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1] };
}

const fmt = (s) =>
  `mean=${s.mean.toFixed(1)}ms p50=${s.p50.toFixed(1)} p95=${s.p95.toFixed(1)} max=${s.max.toFixed(1)}`;

/** یک درخواست کامل؛ خروجی: زمان تا اولین بایت پاسخ + بدنه. */
function get(path) {
  const url = new URL(path, baseUrl);
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const req = request(
      {
        host: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        agent,
        headers: { "cache-control": "no-cache", accept: "text/html" },
      },
      (res) => {
        const ttfb = performance.now() - started;
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve({ ms: ttfb, body: buffer.toString("utf8"), bytes: buffer.length, status: res.statusCode });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function initialScriptWeight(body) {
  const sources = [...new Set([...body.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]))];
  let raw = 0;
  let gz = 0;
  for (const source of sources) {
    const path = source.startsWith("http") ? new URL(source).pathname + new URL(source).search : source;
    try {
      const { body: js } = await get(path);
      const buffer = Buffer.from(js);
      raw += buffer.length;
      gz += gzipSync(buffer, { level: 9 }).length;
    } catch {
      // یک chunk گم‌شده نباید کل اندازه‌گیری را بشکند.
    }
  }
  return { count: sources.length, raw, gz };
}

let failures = 0;
for (const path of PAGES) {
  try {
    await get(path); // گرم‌کردن / پرکردن ISR

    const sequential = [];
    let body = "";
    let bytes = 0;
    for (let i = 0; i < SEQ_SAMPLES; i += 1) {
      const sample = await get(path);
      sequential.push(sample.ms);
      body = sample.body;
      bytes = sample.bytes;
    }

    const concurrent = await Promise.all(Array.from({ length: CONCURRENCY }, () => get(path)));
    const js = await initialScriptWeight(body);

    console.log(`\n${path}`);
    console.log(`  TTFB sequential (${SEQ_SAMPLES}) : ${fmt(stats(sequential))}`);
    console.log(`  TTFB concurrent (${CONCURRENCY}) : ${fmt(stats(concurrent.map((s) => s.ms)))}`);
    console.log(`  HTML           : ${kb(bytes)} raw / ${kb(body.length ? gzipSync(Buffer.from(body), { level: 9 }).length : 0)} gzip`);
    console.log(`  initial JS     : ${js.count} files, ${kb(js.raw)} raw / ${kb(js.gz)} gzip`);
  } catch (error) {
    failures += 1;
    console.error(`\n${path}\n  FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }
}

agent.destroy();

if (failures > 0) {
  console.error(`\n${failures} page(s) failed — is the site running on ${BASE}?`);
  process.exit(1);
}
