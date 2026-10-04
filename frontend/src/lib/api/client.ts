"use client";

import type {
  Enrollment,
  Favorite,
  Me,
  Paginated,
  SearchResponse,
} from "./types";

/**
 * fetch سمت مرورگر — همیشه از مسیر نسبی ``/api/v1`` استفاده می‌کند (پراکسی‌شده
 * توسط Next.js به بک‌اند؛ ر.ک. ``next.config.ts``). ``credentials: "include"``
 * برای ارسال کوکی سشن/CSRF الزامی است.
 */
async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let detail = `درخواست با خطا مواجه شد (${response.status})`;
    try {
      const body = (await response.json()) as Record<string, unknown>;
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body);
    } catch {
      // بدنهٔ غیر-JSON — از پیام پیش‌فرض استفاده می‌شود.
    }
    throw new ApiError(detail, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** باید قبل از هر POST (register/login/contact/...) صدا زده شود تا کوکی CSRF ست شود. */
export async function ensureCsrfCookie(): Promise<void> {
  if (getCookie("csrftoken")) return;
  await fetch("/api/v1/auth/csrf/", { credentials: "include" });
}

async function csrfProtectedFetch<T>(path: string, init: RequestInit): Promise<T> {
  await ensureCsrfCookie();
  const csrfToken = getCookie("csrftoken") ?? "";
  return clientFetch<T>(path, {
    ...init,
    headers: {
      "X-CSRFToken": csrfToken,
      ...init.headers,
    },
  });
}

export const register = (data: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}) => csrfProtectedFetch<Me>("/auth/register/", { method: "POST", body: JSON.stringify(data) });

export const login = (data: { email: string; password: string }) =>
  csrfProtectedFetch<Me>("/auth/login/", { method: "POST", body: JSON.stringify(data) });

export const logout = () => csrfProtectedFetch<void>("/auth/logout/", { method: "POST" });

export const getMe = () => clientFetch<Me>("/auth/me/");

export const updateMe = (data: Partial<Record<string, string>>) =>
  csrfProtectedFetch<Me>("/auth/me/", { method: "PATCH", body: JSON.stringify(data) });

export const getFavorites = () => clientFetch<Paginated<Favorite>>("/auth/favorites/");

export const addFavorite = (contentType: string, publicId: string) =>
  csrfProtectedFetch<Favorite>("/auth/favorites/add/", {
    method: "POST",
    body: JSON.stringify({ content_type: contentType, public_id: publicId }),
  });

export const removeFavorite = (id: number) =>
  csrfProtectedFetch<void>(`/auth/favorites/${id}/`, { method: "DELETE" });

export const getEnrollments = () => clientFetch<Paginated<Enrollment>>("/academy/enrollments/");

export const enrollInCourse = (courseSlug: string) =>
  csrfProtectedFetch<Enrollment>("/academy/enrollments/add/", {
    method: "POST",
    body: JSON.stringify({ course_slug: courseSlug }),
  });

export const submitContactForm = (data: {
  name: string;
  email: string;
  phone?: string;
  project_type: string;
  budget_range: string;
  timeline: string;
  message: string;
  consent_given: boolean;
}) =>
  csrfProtectedFetch<{ public_id: string; name: string; created_at: string }>("/leads/contact/", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const subscribeNewsletter = (data: { email: string; locale_preference?: string }) =>
  csrfProtectedFetch<{ detail: string }>("/leads/newsletter/", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const addComment = (postSlug: string, body: string, parent?: number) =>
  csrfProtectedFetch<Record<string, unknown>>(`/blog/${postSlug}/comments/`, {
    method: "POST",
    body: JSON.stringify({ body, parent: parent ?? null }),
  });

export const globalSearch = (query: string, locale: string) =>
  clientFetch<SearchResponse>(
    `/search/?q=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`,
  );
