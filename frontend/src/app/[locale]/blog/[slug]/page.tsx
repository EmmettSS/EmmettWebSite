import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/molecules/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { CommentForm } from "@/components/organisms/comment-form";
import type { AppLocale } from "@/i18n/routing";
import { getBlogPost } from "@/lib/api/server";

interface PageParams {
  locale: string;
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getBlogPost(locale, slug);
  if (!post) return {};
  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
  };
}

function formatDate(locale: string, iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale as AppLocale);
  const t = await getTranslations("blog");

  const post = await getBlogPost(locale, slug);
  if (!post) notFound();

  const approvedComments = post.comments.filter((comment) => comment.status === "approved");

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-10">
      <Breadcrumb items={[{ label: t("title"), href: "/blog" }, { label: post.title }]} className="mb-8" />

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          {post.author_name ? <span>{post.author_name}</span> : null}
          {post.published_at ? <span>· {formatDate(locale, post.published_at)}</span> : null}
          {post.reading_time_minutes ? (
            <span>· {t("readingTime", { minutes: post.reading_time_minutes })}</span>
          ) : null}
        </p>
        {post.categories.length > 0 || post.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.categories.map((category) => (
              <Badge key={category.slug} variant="outline">
                {category.name}
              </Badge>
            ))}
            {post.tags.map((tag) => (
              <Badge key={tag.slug} variant="neutral">
                {tag.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      {post.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- دامنهٔ تصاویر از بک‌اند پویاست
        <img src={post.cover_image_url} alt="" className="mt-8 w-full rounded-lg object-cover" />
      ) : null}

      {post.toc.length > 0 ? (
        <nav aria-label={t("tableOfContents")} className="mt-8 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">{t("tableOfContents")}</p>
          <ol className="mt-2 flex flex-col gap-1">
            {post.toc.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {entry.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div
        className="markdown-content mt-8"
        dangerouslySetInnerHTML={{ __html: post.content_html }}
      />

      {post.related_posts.length > 0 ? (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-lg font-semibold text-foreground">{t("relatedPosts")}</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {post.related_posts.map((related) => (
              <Link
                key={related.public_id}
                href={`/blog/${related.slug}`}
                className="block rounded-lg border border-border p-4 transition-colors hover:border-primary"
              >
                <p className="text-sm font-medium text-foreground">{related.title}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground">
          {t("comments")}{" "}
          {approvedComments.length > 0 ? (
            <span className="text-sm font-normal text-muted-foreground">
              ({approvedComments.length})
            </span>
          ) : null}
        </h2>

        {approvedComments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("noComments")}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {approvedComments.map((comment) => (
              <li key={comment.id} className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-foreground">{comment.author_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6">
          <CommentForm postSlug={post.slug} />
        </div>
      </section>
    </article>
  );
}
