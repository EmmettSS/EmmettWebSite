import fs from "node:fs/promises";
import path from "node:path";

export interface SafeMediaDescriptor {
  filePath: string;
  contentType: string;
  inline: boolean;
}

const SAFE_MEDIA_TYPES: Readonly<Record<string, { contentType: string; inline: boolean }>> = {
  ".png": { contentType: "image/png", inline: true },
  ".jpg": { contentType: "image/jpeg", inline: true },
  ".jpeg": { contentType: "image/jpeg", inline: true },
  ".webp": { contentType: "image/webp", inline: true },
  ".gif": { contentType: "image/gif", inline: true },
  ".avif": { contentType: "image/avif", inline: true },
  ".pdf": { contentType: "application/pdf", inline: false },
  ".zip": { contentType: "application/zip", inline: false },
};

export function getMediaRootDir(): string {
  return process.env.MEDIA_ROOT
    ? path.resolve(process.env.MEDIA_ROOT)
    : path.resolve(process.cwd(), "../backend/media");
}

/**
 * اعتبارسنجی امن مسیر فایل رسانه روی دیسک مشترک (هم‌راستا با ADR-0005 و media.htaccess.example):
 * - رد کامل null byte، سگمنت‌های خالی/نقطه‌ای و پسوندهای خارج از سفیدفهرست؛
 * - بررسی ``fs.realpath`` برای جلوگیری از فرار با مسیر نسبی یا سیم‌لینک؛
 * - اجبار ``Content-Disposition: attachment`` برای اسناد غیرتصویری.
 */
export async function resolveSafeMediaFile(
  segments: readonly string[],
  mediaRoot: string = getMediaRootDir(),
): Promise<SafeMediaDescriptor | null> {
  if (segments.length === 0) return null;
  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || segment.includes("\0")) {
      return null;
    }
    if (segment.includes("/") || segment.includes("\\")) {
      return null;
    }
  }

  const ext = path.extname(segments[segments.length - 1] ?? "").toLowerCase();
  const typeInfo = SAFE_MEDIA_TYPES[ext];
  if (!typeInfo) return null;

  try {
    const resolvedRoot = await fs.realpath(mediaRoot);
    const candidate = path.join(resolvedRoot, ...segments);
    const resolvedFile = await fs.realpath(candidate);
    if (!resolvedFile.startsWith(`${resolvedRoot}${path.sep}`)) {
      return null;
    }
    const stat = await fs.stat(resolvedFile);
    if (!stat.isFile()) return null;
    return {
      filePath: resolvedFile,
      contentType: typeInfo.contentType,
      inline: typeInfo.inline,
    };
  } catch {
    return null;
  }
}

export function buildMediaResponseHeaders(descriptor: SafeMediaDescriptor): Headers {
  const headers = new Headers({
    "Content-Type": descriptor.contentType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  if (!descriptor.inline) {
    headers.set("Content-Disposition", "attachment");
  }
  return headers;
}
