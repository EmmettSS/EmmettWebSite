import { CACHE_TAGS } from "@/lib/cache-tags";
import { getSafeErrorType, logUpstreamFailure } from "./upstream-logging";
import { getApiBaseUrl } from "./config";
import type {
  AISuggestion,
  BlogPostDetail,
  BlogPostListItem,
  Catalog,
  CourseDetail,
  CourseListItem,
  Paginated,
  ProjectDetail,
  ProjectListItem,
  SearchResponse,
  ServiceDetail,
  ServiceListItem,
  TeamMember,
  Testimonial,
} from "./types";

/**
 * استخراج هدر IP واقعی کاربر از ``Headers`` ورودی درخواست Next.js برای عبور به بک‌اند
 * در پراکسی ``/api/[...path]`` و فراخوانی‌های پویای SSR تا کاربران واقعی پشت
 * ``127.0.0.1`` در یک سطل مشترک Throttle ننشینند.
 */
export function extractForwardedClientIp(requestHeaders: Pick<Headers, "get">): string | undefined {
  const forwarded = requestHeaders.get("x-forwarded-for")?.trim();
  if (forwarded) return forwarded;
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  return realIp ? realIp : undefined;
}

/**
 * fetch سمت سرور (Server Component) — مستقیماً بک‌اند Django را صدا می‌زند
 * (هرگز از مرورگر عبور نمی‌کند). هدر ``Accept-Language`` معادل locale درخواستی
 * next-intl را ست می‌کند تا پاسخ API در زبان درست برگردد.
 */
async function serverFetch<T>(
  path: string,
  locale: string,
  init?: RequestInit,
  tags: readonly string[] = [],
): Promise<T | null> {
  const url = `${getApiBaseUrl()}${path}`;
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Accept-Language": locale,
        "X-Forwarded-Proto": "https",
        ...init?.headers,
      },
      // محتوای ویترین مرتباً تغییر می‌کند؛ کش کوتاه برای تعادل تازگی/کارایی.
      next: { revalidate: 60, ...(tags.length > 0 ? { tags: [...tags] } : {}) },
    });
    if (!response.ok) {
      logUpstreamFailure("django-ssr", path, { status: response.status });
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    logUpstreamFailure("django-ssr", path, { errorType: getSafeErrorType(error) });
    return null;
  }
}

export const getServices = (locale: string, searchParams?: string) =>
  serverFetch<Paginated<ServiceListItem>>(
    `/services/${searchParams ? `?${searchParams}` : ""}`,
    locale,
    undefined,
    [CACHE_TAGS.services],
  );

export const getService = (locale: string, slug: string) =>
  serverFetch<ServiceDetail>(`/services/${slug}/`, locale, undefined, [CACHE_TAGS.services]);

export const getProjects = (locale: string, searchParams?: string) =>
  serverFetch<Paginated<ProjectListItem>>(
    `/projects/${searchParams ? `?${searchParams}` : ""}`,
    locale,
    undefined,
    [CACHE_TAGS.projects],
  );

export const getProject = (locale: string, slug: string) =>
  serverFetch<ProjectDetail>(`/projects/${slug}/`, locale, undefined, [CACHE_TAGS.projects]);

export const getCourses = (locale: string, searchParams?: string) =>
  serverFetch<Paginated<CourseListItem>>(
    `/academy/${searchParams ? `?${searchParams}` : ""}`,
    locale,
    undefined,
    [CACHE_TAGS.academy],
  );

export const getCourse = (locale: string, slug: string) =>
  serverFetch<CourseDetail>(`/academy/${slug}/`, locale, undefined, [CACHE_TAGS.academy]);

export const getBlogPosts = (locale: string, searchParams?: string) =>
  serverFetch<Paginated<BlogPostListItem>>(
    `/blog/${searchParams ? `?${searchParams}` : ""}`,
    locale,
    undefined,
    [CACHE_TAGS.blog],
  );

export const getBlogPost = (locale: string, slug: string) =>
  serverFetch<BlogPostDetail>(`/blog/${slug}/`, locale, undefined, [CACHE_TAGS.blog]);

export const getTeamMembers = (locale: string) =>
  serverFetch<Paginated<TeamMember>>("/company/team/", locale, undefined, [CACHE_TAGS.company]);

export const getTestimonials = (locale: string, featured?: boolean) =>
  serverFetch<Paginated<Testimonial>>(
    `/company/testimonials/${featured ? "?featured=true" : ""}`,
    locale,
    undefined,
    [CACHE_TAGS.company],
  );

export const searchSite = (locale: string, query: string, clientIpHeader?: string) =>
  serverFetch<SearchResponse>(
    `/search/?q=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`,
    locale,
    clientIpHeader ? { headers: { "X-Forwarded-For": clientIpHeader } } : undefined,
    [CACHE_TAGS.search],
  );

export const getCatalogs = (locale: string, keys?: string[]) =>
  serverFetch<Catalog[]>(
    `/ai/catalogs/${keys?.length ? `?keys=${encodeURIComponent(keys.join(","))}` : ""}`,
    locale,
  );

export async function getSharedAISuggestion(
  locale: string,
  token: string,
  clientIpHeader?: string,
): Promise<AISuggestion | null> {
  const url = `${getApiBaseUrl()}/ai/results/${encodeURIComponent(token)}/`;
  const reqHeaders: Record<string, string> = {
    "Accept-Language": locale,
    "X-Forwarded-Proto": "https",
  };
  if (clientIpHeader) {
    reqHeaders["X-Forwarded-For"] = clientIpHeader;
  }
  try {
    const response = await fetch(url, {
      headers: reqHeaders,
      cache: "no-store",
    });
    if (!response.ok) {
      logUpstreamFailure("django-ssr", "/ai/results/:token/", { status: response.status });
      return null;
    }
    return (await response.json()) as AISuggestion;
  } catch (error) {
    logUpstreamFailure("django-ssr", "/ai/results/:token/", {
      errorType: getSafeErrorType(error),
    });
    return null;
  }
}
