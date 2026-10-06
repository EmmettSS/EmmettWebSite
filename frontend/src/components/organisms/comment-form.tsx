"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { FormGroup } from "@/components/molecules/form-group";
import { ApiError, addComment, getMe } from "@/lib/api/client";

interface CommentFormProps {
  postSlug: string;
}

/**
 * فرم ثبت نظر زیر هر پست — فقط برای کاربران واردشده قابل استفاده است؛
 * نظر ثبت‌شده بلافاصله در لیست نمایش داده نمی‌شود چون منتظر تأیید ادمین
 * است (status=pending)، پس به‌جای رفرش لیست، پیام تأیید نمایش داده می‌شود.
 */
export function CommentForm({ postSlug }: CommentFormProps) {
  const t = useTranslations("blog");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then(() => {
        if (!cancelled) setIsAuthenticated(true);
      })
      .catch((error: unknown) => {
        // DRF با SessionAuthentication برای کاربر مهمان ۴۰۳ برمی‌گرداند (نه
        // ۴۰۱، چون هیچ auth scheme دارای WWW-Authenticate تنظیم نشده است).
        const isGuest = error instanceof ApiError && (error.status === 401 || error.status === 403);
        if (!cancelled) setIsAuthenticated(!isGuest);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isAuthenticated === false) {
    return <p className="text-sm text-muted-foreground">{t("commentLoginRequired")}</p>;
  }

  if (isAuthenticated === null) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setStatus("submitting");
    try {
      await addComment(postSlug, body.trim());
      setBody("");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FormGroup label={t("addComment")}>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("commentPlaceholder")}
          rows={3}
          className="flex w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors duration-fast ease-emmett-standard placeholder:text-muted-foreground focus-visible:border-primary focus-visible:bg-secondary/30 focus-visible:outline-none"
        />
      </FormGroup>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" isLoading={status === "submitting"}>
          {t("commentSubmit")}
        </Button>
        {status === "sent" ? (
          <p className="text-xs text-muted-foreground">{t("commentPending")}</p>
        ) : null}
        {status === "error" ? (
          <p className="text-xs text-destructive">{t("commentPending")}</p>
        ) : null}
      </div>
    </form>
  );
}
