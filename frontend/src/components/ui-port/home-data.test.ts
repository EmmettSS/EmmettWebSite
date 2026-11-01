import { describe, expect, it } from "vitest";

import type {
  BlogPostListItem,
  CourseListItem,
  Paginated,
  ProjectListItem,
  ServiceListItem,
} from "@/lib/api/types";
import { mapArticles, mapCourses, mapProducts, mapProjects, mapServices } from "./home-data";

function page<T>(results: T[], count = results.length): Paginated<T> {
  return { count, total_pages: 1, current_page: 1, next: null, previous: null, results };
}

describe("home section mappers", () => {
  it("maps service copy, tags and links only from the API record", () => {
    const services = page<ServiceListItem>([
      {
        public_id: "svc-1",
        title: "مهندسی نرم‌افزار",
        slug: "software",
        summary: "سیستم‌های قابل اتکا",
        icon: "code",
        categories: [],
        tags: [{ name: "Architecture", slug: "architecture" }],
        is_featured: true,
        order: 1,
      },
    ]);

    expect(mapServices(services)).toEqual([
      {
        id: "svc-1",
        num: "01",
        title: "مهندسی نرم‌افزار",
        copy: "سیستم‌های قابل اتکا",
        tags: ["Architecture"],
        href: "/services/software",
      },
    ]);
    expect(mapServices(page([]))).toEqual([]);
    expect(mapServices(null)).toBeNull();
  });

  it("maps product tags, metrics and technology only from its database case study", () => {
    const products = page<ProjectListItem>([
      {
        public_id: "prd-1",
        title: "Pentestor",
        slug: "pentestor",
        summary: "ارزیابی امنیتی",
        client_name: "",
        cover_image_url: null,
        year: 2026,
        is_product: true,
        is_featured: false,
        categories: [],
        tags: [{ name: "Security", slug: "security" }],
        case_study: {
          technology_stack: ["Python", "PostgreSQL"],
          metrics: { latency: "18ms" },
        },
      },
    ]);

    expect(mapProducts(products)).toEqual([
      {
        id: "prd-1",
        num: "01",
        name: "Pentestor",
        copy: "ارزیابی امنیتی",
        href: "/projects/pentestor",
        year: "2026",
        tags: ["Security"],
        technologyStack: ["Python", "PostgreSQL"],
        metrics: [{ label: "latency", value: "18ms" }],
      },
    ]);
    expect(mapProducts(page([]))).toEqual([]);
    expect(mapProducts(null)).toBeNull();
  });

  it("previews published projects and maps categories, case-study facts and totals", () => {
    const projects = page<ProjectListItem>(
      Array.from({ length: 4 }, (_, index) => ({
        public_id: `p-${index}`,
        title: `Project ${index}`,
        slug: `project-${index}`,
        summary: "summary",
        client_name: "",
        cover_image_url: null,
        year: null,
        is_product: false,
        is_featured: false,
        categories: [
          {
            public_id: `category-${index}`,
            name: "Research",
            slug: "research",
            scope: "portfolio" as const,
            parent_slug: null,
          },
        ],
        tags: [],
        case_study: null,
      })),
      12,
    );

    const mapped = mapProjects(projects)!;
    expect(mapped).toHaveLength(3);
    expect(mapped[0]).toMatchObject({
      year: "",
      industry: "Research",
      href: "/projects/project-0",
      metrics: [],
      technologyStack: [],
    });
    expect(projects.count).toBe(12);
    expect(mapProjects(null)).toBeNull();
  });

  it("formats article dates and maps category and author from the record", () => {
    const posts = page<BlogPostListItem>([
      {
        public_id: "post-1",
        title: "Throughput",
        slug: "throughput",
        excerpt: "notes",
        cover_image_url: null,
        author_name: "Ali Karimi",
        categories: [
          {
            public_id: "cat-1",
            name: "Systems",
            slug: "systems",
            scope: "blog",
            parent_slug: null,
          },
        ],
        reading_time_minutes: 14,
        published_at: "2026-08-12T00:00:00Z",
      },
    ]);

    const en = mapArticles(posts, "en", "min")?.[0];
    const fa = mapArticles(posts, "fa", "دقیقه")?.[0];
    expect(en).toMatchObject({
      href: "/blog/throughput",
      category: "Systems",
      initials: "AK",
      readTime: "14 min",
      date: "August 12, 2026",
    });
    expect(fa?.date).not.toBe(en?.date);
    expect(fa?.date.length).toBeGreaterThan(0);
    expect(mapArticles(null, "en", "min")).toBeNull();
  });

  it("maps course duration and lesson count from the database", () => {
    const courses = page<CourseListItem>([
      {
        public_id: "c-1",
        title: "Systems",
        slug: "systems",
        summary: "",
        level: "beginner",
        duration_hours: "12.5",
        instructor_name: null,
        cover_image_url: null,
        is_featured: false,
        lesson_count: 8,
      },
    ]);

    expect(
      mapCourses(courses, (level) => (level === "beginner" ? "مبتدی" : level), "ساعت"),
    ).toEqual([
      {
        id: "c-1",
        slug: "systems",
        title: "Systems",
        levelLabel: "مبتدی",
        meta: "12.5 ساعت",
        lessonCount: 8,
        href: "/academy/systems",
      },
    ]);
    expect(mapCourses(null, (level) => level, "hours")).toBeNull();
  });
});
