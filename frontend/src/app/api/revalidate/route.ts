import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

import { isAllowedRevalidationTag } from "@/lib/cache-tags";
import { getSafeErrorType, logUpstreamFailure } from "@/lib/api/upstream-logging";

const MAX_BODY_BYTES = 4096;
const MAX_TAGS_PER_REQUEST = 20;

function unauthorized(request: Request, secret: string): boolean {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, supplied] = authorization.split(" ", 2);
  if (scheme !== "Bearer" || !supplied) return false;

  const expectedBytes = Buffer.from(secret, "utf8");
  const suppliedBytes = Buffer.from(supplied, "utf8");
  return (
    expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

async function readRequestBody(request: Request): Promise<{ body?: string; tooLarge: boolean }> {
  const reader = request.body?.getReader();
  if (!reader) return { body: "", tooLarge: false };

  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_BODY_BYTES) {
      await reader.cancel();
      return { tooLarge: true };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body: new TextDecoder().decode(bytes), tooLarge: false };
}

function jsonResponse(payload: Record<string, unknown>, status: number): Response {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.FRONTEND_REVALIDATE_SECRET?.trim();
  if (!secret) {
    return jsonResponse({ detail: "Revalidation is not configured." }, 503);
  }
  if (!unauthorized(request, secret)) {
    return jsonResponse({ detail: "Invalid revalidation credentials." }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ detail: "Revalidation request is too large." }, 413);
  }

  let body: { body?: string; tooLarge: boolean };
  try {
    body = await readRequestBody(request);
  } catch {
    return jsonResponse({ detail: "A JSON revalidation payload is required." }, 400);
  }
  if (body.tooLarge) {
    return jsonResponse({ detail: "Revalidation request is too large." }, 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body.body ?? "");
  } catch {
    return jsonResponse({ detail: "A JSON revalidation payload is required." }, 400);
  }

  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ detail: "The revalidation payload must be an object." }, 400);
  }

  const tags = (payload as { tags?: unknown }).tags;
  if (
    !Array.isArray(tags) ||
    tags.length === 0 ||
    tags.length > MAX_TAGS_PER_REQUEST ||
    tags.some((tag) => !isAllowedRevalidationTag(tag))
  ) {
    return jsonResponse({ detail: "One or more cache tags are invalid." }, 400);
  }

  const uniqueTags = [...new Set(tags)];
  try {
    for (const tag of uniqueTags) {
      revalidateTag(tag, { expire: 0 });
    }
  } catch (error) {
    logUpstreamFailure("next-cache", "/api/revalidate", {
      status: 500,
      errorType: getSafeErrorType(error),
    });
    return jsonResponse({ detail: "Cache revalidation failed." }, 500);
  }

  return jsonResponse({ revalidated: uniqueTags }, 200);
}
