/**
 * Thin API client for the Django backend.
 * Deliberately tiny: no third-party dependency, Persian-first error messages and a
 * chunked-polling helper that mirrors ADR-008 (no WebSockets anywhere).
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
export const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly messageFa: string, readonly messageEn: string, readonly detail?: unknown) {
    super(`${code} (${status})`);
    this.name = "ApiError";
  }
}

const NETWORK_ERROR = {
  code: "network",
  messageFa: "ارتباط با سرویس برقرار نشد. اتصال اینترنت یا دسترسی سرویس را بررسی کنید.",
  messageEn: "Could not reach the service. Check your connection or service availability.",
};

export type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  locale?: "fa" | "en";
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = REQUEST_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (options.signal) options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const response = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      let payload: Record<string, unknown> = {};
      try {
        payload = (await response.json()) as Record<string, unknown>;
      } catch {
        payload = {};
      }
      throw new ApiError(response.status, statusCode(response.status), pickMessage(payload, "fa", response.status), pickMessage(payload, "en", response.status), payload);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, NETWORK_ERROR.code, NETWORK_ERROR.messageFa, NETWORK_ERROR.messageEn, error);
  } finally {
    clearTimeout(timer);
  }
}

function statusCode(status: number): string {
  if (status === 400) return "bad-request";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "server-error";
  return "http-error";
}

function pickMessage(payload: Record<string, unknown>, locale: "fa" | "en", status: number): string {
  const key = locale === "fa" ? "message_fa" : "message_en";
  if (typeof payload[key] === "string") return payload[key] as string;
  const detail = payload.detail;
  if (typeof detail === "string") return detail;
  const code = statusCode(status);
  const table: Record<string, string> = locale === "fa"
    ? { "bad-request": "ورودی نامعتبر است.", forbidden: "این درخواست مجاز نیست.", "rate-limited": "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید.", "server-error": "خطای سرویس. لطفاً بعداً تلاش کنید.", "http-error": "درخواست انجام نشد." }
    : { "bad-request": "Invalid input.", forbidden: "This request is not allowed.", "rate-limited": "Too many requests; try again shortly.", "server-error": "Service error; please retry later.", "http-error": "The request failed." };
  return table[code] ?? (locale === "fa" ? "درخواست انجام نشد." : "The request failed.");
}

export function apiGet<T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> {
  return request<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}): Promise<T> {
  return request<T>(path, { ...options, method: "POST", body });
}

/* ------------------------------------------------------------------ *
 * Chunked polling (ADR-008)
 * ------------------------------------------------------------------ */

export type PollState = "pending" | "running" | "done" | "failed";

export type JobPollResponse<TResult, TStep = unknown> = {
  job_id: number;
  state: PollState;
  progress: TStep[];
  offset_next: number;
  result: TResult | null;
  error?: string | null;
};

export type PollOptions<TStep> = {
  offset?: number;
  intervalMs?: number;
  maxMs?: number;
  signal?: AbortSignal;
  onProgress?: (steps: TStep[], offset: number) => void;
  onState?: (state: PollState) => void;
};

export class PollTimeoutError extends Error {
  constructor() {
    super("polling timed out");
    this.name = "PollTimeoutError";
  }
}

/** Polls a job endpoint with an offset until it reaches `done`, mirroring §۵.۳ exactly. */
export async function pollJob<TResult, TStep = unknown>(path: string, options: PollOptions<TStep> = {}): Promise<{ result: TResult | null; error: string | null }> {
  const { offset: initialOffset = 0, intervalMs = 700, maxMs = 120_000, signal, onProgress, onState } = options;
  const started = Date.now();
  let offset = initialOffset;
  for (;;) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const response = await apiGet<JobPollResponse<TResult, TStep>>(`${path}?offset=${offset}`, { signal, timeoutMs: 12_000 });
    offset = response.offset_next ?? offset;
    if (response.progress?.length) onProgress?.(response.progress, offset);
    onState?.(response.state);
    if (response.state === "done") return { result: response.result, error: null };
    if (response.state === "failed") return { result: null, error: response.error ?? "job failed" };
    if (Date.now() - started > maxMs) throw new PollTimeoutError();
    await delay(intervalMs, signal);
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}
