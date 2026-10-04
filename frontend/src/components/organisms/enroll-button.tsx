"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ApiError, enrollInCourse, getEnrollments, getMe } from "@/lib/api/client";

interface EnrollButtonProps {
  courseSlug: string;
}

type Status = "checking" | "guest" | "enrollable" | "enrolled" | "submitting" | "error";

/**
 * دکمهٔ ثبت‌نام در دوره — وضعیت ورود و enrollment موجود را از API چک می‌کند؛
 * اگر کاربر مهمان باشد، به‌جای دکمه به `/profile` لینک می‌دهد (قانون ۱۸:
 * هیچ عملی که نیاز به auth دارد نباید کاربر را گیج کند).
 */
export function EnrollButton({ courseSlug }: EnrollButtonProps) {
  const t = useTranslations("academy");
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        await getMe();
        const enrollments = await getEnrollments();
        const alreadyEnrolled = enrollments.results.some(
          (enrollment) => enrollment.course.slug === courseSlug,
        );
        if (!cancelled) setStatus(alreadyEnrolled ? "enrolled" : "enrollable");
      } catch (error) {
        // DRF با SessionAuthentication برای کاربر مهمان ۴۰۳ برمی‌گرداند (نه
        // ۴۰۱، چون هیچ auth scheme دارای WWW-Authenticate تنظیم نشده است).
        const isGuest = error instanceof ApiError && (error.status === 401 || error.status === 403);
        if (!cancelled) setStatus(isGuest ? "guest" : "error");
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [courseSlug]);

  if (status === "checking") {
    return (
      <Button disabled size="lg">
        {t("enroll")}
      </Button>
    );
  }

  if (status === "guest") {
    return (
      <Button asChild size="lg" variant="secondary">
        <Link href="/profile">{t("enrollRequiresLogin")}</Link>
      </Button>
    );
  }

  if (status === "enrolled") {
    return (
      <Button disabled size="lg" variant="secondary">
        {t("enrolled")}
      </Button>
    );
  }

  async function handleEnroll() {
    setStatus("submitting");
    try {
      await enrollInCourse(courseSlug);
      setStatus("enrolled");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Button size="lg" isLoading={status === "submitting"} onClick={() => void handleEnroll()}>
      {t("enroll")}
    </Button>
  );
}
