export interface Paginated<T> {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Category {
  public_id: string;
  name: string;
  slug: string;
  scope: "blog" | "academy" | "portfolio" | "service";
  parent_slug: string | null;
}

export interface Tag {
  name: string;
  slug: string;
}

export interface ServiceListItem {
  public_id: string;
  title: string;
  slug: string;
  summary: string;
  icon: string;
  is_featured: boolean;
  order: number;
}

export interface ServiceDetail extends Omit<ServiceListItem, "summary"> {
  summary: string;
  description_html: string;
  categories: Category[];
  tags: Tag[];
  meta_title: string;
  meta_description: string;
  canonical_path: string;
  published_at: string | null;
}

export interface ProjectListItem {
  public_id: string;
  title: string;
  slug: string;
  summary: string;
  client_name: string;
  cover_image_url: string | null;
  year: number | null;
  is_product: boolean;
  is_featured: boolean;
}

export interface CaseStudy {
  challenge_html: string;
  approach_html: string;
  architecture_notes_html: string;
  technology_stack: string[];
  implementation_notes_html: string;
  result_html: string;
  metrics: Record<string, string>;
}

export interface ProjectDetail extends ProjectListItem {
  service_slug: string | null;
  categories: Category[];
  tags: Tag[];
  gallery_urls: string[];
  case_study: CaseStudy | null;
  meta_title: string;
  meta_description: string;
  canonical_path: string;
}

export interface Instructor {
  public_id: string;
  name: string;
  title: string;
  bio: string;
  photo_url: string | null;
}

export interface Lesson {
  id: number;
  title: string;
  summary: string;
  content_html: string;
  video_url: string;
  order: number;
  duration_minutes: number;
  is_preview: boolean;
}

export interface CourseListItem {
  public_id: string;
  title: string;
  slug: string;
  summary: string;
  level: "beginner" | "intermediate" | "advanced";
  duration_hours: string;
  instructor_name: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
}

export interface CourseDetail extends CourseListItem {
  description_html: string;
  instructor: Instructor | null;
  categories: Category[];
  tags: Tag[];
  lessons: Lesson[];
  meta_title: string;
  meta_description: string;
  canonical_path: string;
}

export interface BlogPostListItem {
  public_id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  author_name: string | null;
  reading_time_minutes: number;
  published_at: string | null;
}

export interface Comment {
  id: number;
  author_name: string;
  parent: number | null;
  body: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface TocEntry {
  level: string;
  id: string;
  text: string;
}

export interface BlogPostDetail extends BlogPostListItem {
  content_html: string;
  categories: Category[];
  tags: Tag[];
  view_count: number;
  toc: TocEntry[];
  comments: Comment[];
  related_posts: BlogPostListItem[];
  meta_title: string;
  meta_description: string;
  canonical_path: string;
}

export interface TeamMember {
  public_id: string;
  full_name: string;
  role_title: string;
  bio: string;
  photo_url: string | null;
  social_links: Record<string, string>;
  order: number;
}

export interface Testimonial {
  id: number;
  author_name: string;
  author_role: string;
  author_company: string;
  author_photo_url: string | null;
  quote: string;
  related_project_slug: string | null;
  is_featured: boolean;
}

export interface SearchResult {
  content_type: string;
  public_id: string;
  title: string;
  url_path: string;
  category_label: string;
  rank: number;
}

export interface SearchResponse {
  query: string;
  locale: string;
  count: number;
  results: SearchResult[];
}

export interface MeProfile {
  avatar_url: string | null;
  bio: string;
  locale_preference: "fa" | "en";
  job_title: string;
  company_name: string;
}

export interface Me {
  public_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "admin" | "editor" | "student" | "client";
  is_phone_verified: boolean;
  profile: MeProfile;
}

export interface Favorite {
  id: number;
  content_type_label: string;
  object_id: number;
  target_title: string | null;
  created_at: string;
}

export interface Enrollment {
  public_id: string;
  course: {
    public_id: string;
    title: string;
    slug: string;
    summary: string;
    level: string;
  };
  status: "active" | "completed" | "cancelled";
  enrolled_at: string;
  completed_at: string | null;
  progress_percent: number;
}
