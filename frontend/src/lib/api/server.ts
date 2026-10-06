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
 * fetch سمت سرور (Server Component) — مستقیماً بک‌اند Django را صدا می‌زند
 * (هرگز از مرورگر عبور نمی‌کند). هدر ``Accept-Language`` معادل locale درخواستی
 * next-intl را ست می‌کند تا پاسخ API در زبان درست برگردد.
 */
async function serverFetch<T>(path: string, locale: string, init?: RequestInit): Promise<T | null> {
  const url = `${getApiBaseUrl()}${path}`;
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Accept-Language": locale,
        ...init?.headers,
      },
      // محتوای ویترین مرتباً تغییر می‌کند؛ کش کوتاه برای تعادل تازگی/کارایی.
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const getServices = (locale: string) =>
  serverFetch<Paginated<ServiceListItem>>("/services/", locale);

export const getService = (locale: string, slug: string) =>
  serverFetch<ServiceDetail>(`/services/${slug}/`, locale);

export const getProjects = (locale: string, searchParams?: string) =>
  serverFetch<Paginated<ProjectListItem>>(
    `/projects/${searchParams ? `?${searchParams}` : ""}`,
    locale,
  );

export const getProject = (locale: string, slug: string) =>
  serverFetch<ProjectDetail>(`/projects/${slug}/`, locale);

export const getCourses = (locale: string, searchParams?: string) =>
  serverFetch<Paginated<CourseListItem>>(
    `/academy/${searchParams ? `?${searchParams}` : ""}`,
    locale,
  );

export const getCourse = (locale: string, slug: string) =>
  serverFetch<CourseDetail>(`/academy/${slug}/`, locale);

export const getBlogPosts = (locale: string, searchParams?: string) =>
  serverFetch<Paginated<BlogPostListItem>>(
    `/blog/${searchParams ? `?${searchParams}` : ""}`,
    locale,
  );

export const getBlogPost = (locale: string, slug: string) =>
  serverFetch<BlogPostDetail>(`/blog/${slug}/`, locale);

export const getTeamMembers = (locale: string) =>
  serverFetch<Paginated<TeamMember>>("/company/team/", locale);

export const getTestimonials = (locale: string, featured?: boolean) =>
  serverFetch<Paginated<Testimonial>>(
    `/company/testimonials/${featured ? "?featured=true" : ""}`,
    locale,
  );

export const searchSite = (locale: string, query: string) =>
  serverFetch<SearchResponse>(
    `/search/?q=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`,
    locale,
  );

export const getCatalogs = (locale: string, keys?: string[]) =>
  serverFetch<Catalog[]>(
    `/ai/catalogs/${keys?.length ? `?keys=${encodeURIComponent(keys.join(","))}` : ""}`,
    locale,
  );

export async function getSharedAISuggestion(
  locale: string,
  token: string,
): Promise<AISuggestion | null> {
  const url = `${getApiBaseUrl()}/ai/results/${encodeURIComponent(token)}/`;
  try {
    const response = await fetch(url, {
      headers: { "Accept-Language": locale },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as AISuggestion;
  } catch {
    return null;
  }
}
