import type {
  BlogPostListItem,
  CourseListItem,
  Paginated,
  ProjectListItem,
  ServiceListItem,
} from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { toAppLocale } from "@/lib/seo/site";

/** Typed, presentation-ready values mapped only from published CMS API records. */
export type HomeService = {
  id: string;
  num: string;
  title: string;
  copy: string;
  tags: string[];
  href: string;
};

export type HomeMetric = { label: string; value: string };

export type HomeProduct = {
  id: string;
  num: string;
  name: string;
  copy: string;
  href: string;
  year: string;
  tags: string[];
  technologyStack: string[];
  metrics: HomeMetric[];
};

export type HomeProject = {
  id: string;
  num: string;
  title: string;
  industry: string;
  description: string;
  year: string;
  href: string;
  tags: string[];
  technologyStack: string[];
  metrics: HomeMetric[];
};

export type HomeArticle = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  initials: string;
  date: string;
  readTime: string;
  href: string;
};

export type HomeCourse = {
  id: string;
  slug: string;
  title: string;
  levelLabel: string;
  meta: string;
  lessonCount: number;
  href: string;
};

export type HomeContent = {
  /** null = API unavailable; [] = API succeeded but has no published records. */
  services: HomeService[] | null;
  products: HomeProduct[] | null;
  projects: HomeProject[] | null;
  projectTotal: number;
  articles: HomeArticle[] | null;
  courses: HomeCourse[] | null;
};

const PREVIEW = { products: 3, projects: 3, articles: 5, courses: 3 } as const;

function pad(index: number, width: number) {
  return String(index + 1).padStart(width, "0");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
  return `${first}${second}`.toUpperCase();
}

function metricsFromProject(project: ProjectListItem): HomeMetric[] {
  return Object.entries(project.case_study?.metrics ?? {}).map(([label, value]) => ({
    label,
    value: String(value),
  }));
}

export function mapServices(data: Paginated<ServiceListItem> | null): HomeService[] | null {
  if (data === null) return null;
  return data.results.map((service, index) => ({
    id: service.public_id,
    num: pad(index, 2),
    title: service.title,
    copy: service.summary,
    tags: service.tags.map((tag) => tag.name),
    href: `/services/${service.slug}`,
  }));
}

export function mapProducts(data: Paginated<ProjectListItem> | null): HomeProduct[] | null {
  if (data === null) return null;
  return data.results.slice(0, PREVIEW.products).map((product, index) => ({
    id: product.public_id,
    num: pad(index, 2),
    name: product.title,
    copy: product.summary,
    href: `/projects/${product.slug}`,
    year: product.year == null ? "" : String(product.year),
    tags: product.tags.map((tag) => tag.name),
    technologyStack: product.case_study?.technology_stack ?? [],
    metrics: metricsFromProject(product),
  }));
}

export function mapProjects(data: Paginated<ProjectListItem> | null): HomeProject[] | null {
  if (data === null) return null;
  return data.results.slice(0, PREVIEW.projects).map((project, index) => ({
    id: project.public_id,
    num: pad(index, 3),
    title: project.title,
    industry: project.categories[0]?.name ?? "",
    description: project.summary,
    year: project.year == null ? "" : String(project.year),
    href: `/projects/${project.slug}`,
    tags: project.tags.map((tag) => tag.name),
    technologyStack: project.case_study?.technology_stack ?? [],
    metrics: metricsFromProject(project),
  }));
}

export function mapArticles(
  data: Paginated<BlogPostListItem> | null,
  locale: string,
  minuteLabel: string,
): HomeArticle[] | null {
  if (data === null) return null;
  const appLocale = toAppLocale(locale);
  return data.results.slice(0, PREVIEW.articles).map((post) => ({
    id: post.public_id,
    title: post.title,
    excerpt: post.excerpt,
    category: post.categories[0]?.name ?? "",
    author: post.author_name ?? "",
    initials: initials(post.author_name ?? ""),
    date: post.published_at ? formatDate(post.published_at, appLocale) : "",
    readTime: `${post.reading_time_minutes} ${minuteLabel}`,
    href: `/blog/${post.slug}`,
  }));
}

export function mapCourses(
  data: Paginated<CourseListItem> | null,
  levelLabel: (level: CourseListItem["level"]) => string,
  hoursLabel: string,
): HomeCourse[] | null {
  if (data === null) return null;
  return data.results.slice(0, PREVIEW.courses).map((course) => ({
    id: course.public_id,
    slug: course.slug,
    title: course.title,
    levelLabel: levelLabel(course.level),
    meta: course.duration_hours ? `${course.duration_hours} ${hoursLabel}` : "",
    lessonCount: course.lesson_count,
    href: `/academy/${course.slug}`,
  }));
}
