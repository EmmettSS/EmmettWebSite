import fs from "node:fs/promises";

import { NextResponse, type NextRequest } from "next/server";

import { buildMediaResponseHeaders, resolveSafeMediaFile } from "@/lib/media";

/**
 * سرو امن فایل‌های ``/media/*`` برای بهینه‌ساز تصویر داخلی Next.js 16 (``/_next/image``)
 * و محیط‌های بدون وب‌سرور جلویی:
 * ۱) ابتدا فایل تاییدشده را مستقیماً از ``MEDIA_ROOT`` روی دیسک مشترک می‌خواند
 *    (بدون حلقهٔ شبکه، بدون مسدودشدن توسط ضد-SSRF آی‌پی خصوصی در Next 16، و حتی وقتی
 *    ``DEBUG=False`` در جنگو مسیر ``/media/`` را غیرفعال کرده است).
 * ۲) اگر فایل روی دیسک محلی نبود (استقرار چندکانتینری)، به بک‌اند upstream رجوع می‌کند.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path: segments } = await context.params;
  const local = await resolveSafeMediaFile(segments);
  if (local) {
    const body = await fs.readFile(local.filePath);
    return new NextResponse(body, {
      status: 200,
      headers: buildMediaResponseHeaders(local),
    });
  }

  const internalBase = (process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8000").replace(
    /\/+$/,
    "",
  );
  const encodedPath = segments.map((part) => encodeURIComponent(part)).join("/");
  try {
    const upstream = await fetch(`${internalBase}/media/${encodedPath}`, {
      headers: { "X-Forwarded-Proto": "https" },
      cache: "no-store",
    });
    if (!upstream.ok) {
      return new NextResponse("Not Found", { status: 404 });
    }
    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    return new NextResponse(upstream.body, { status: 200, headers });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
