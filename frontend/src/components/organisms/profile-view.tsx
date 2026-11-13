"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormGroup } from "@/components/molecules/form-group";
import { Link } from "@/i18n/navigation";
import {
  ApiError,
  getEnrollments,
  getFavorites,
  getMe,
  login,
  logout,
  register,
  removeFavorite,
  updateMe,
} from "@/lib/api/client";
import type { Enrollment, Favorite, Me } from "@/lib/api/types";

type Tab = "login" | "register";

export function ProfileView() {
  const t = useTranslations("profile");
  const common = useTranslations("common");
  const [me, setMe] = useState<Me | null | "loading">("loading");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [tab, setTab] = useState<Tab>("login");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  async function loadUserData() {
    try {
      const profile = await getMe();
      setMe(profile);
      const [favoritesData, enrollmentsData] = await Promise.all([
        getFavorites(),
        getEnrollments(),
      ]);
      setFavorites(favoritesData.results);
      setEnrollments(enrollmentsData.results);
    } catch {
      setMe(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const profile = await getMe();
        if (cancelled) return;
        setMe(profile);
        const [favoritesData, enrollmentsData] = await Promise.all([
          getFavorites(),
          getEnrollments(),
        ]);
        if (cancelled) return;
        setFavorites(favoritesData.results);
        setEnrollments(enrollmentsData.results);
      } catch {
        if (!cancelled) setMe(null);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    const form = new FormData(event.currentTarget);
    try {
      await login({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      await loadUserData();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    const form = new FormData(event.currentTarget);
    try {
      await register({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        first_name: String(form.get("first_name") ?? ""),
        last_name: String(form.get("last_name") ?? ""),
        phone: String(form.get("phone") ?? "") || undefined,
      });
      await loadUserData();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleProfileUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setProfileError(null);
    setIsSubmitting(true);
    try {
      const updated = await updateMe({
        first_name: String(form.get("first_name") ?? ""),
        last_name: String(form.get("last_name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        bio: String(form.get("bio") ?? ""),
        job_title: String(form.get("job_title") ?? ""),
        company_name: String(form.get("company_name") ?? ""),
      });
      setMe(updated);
      setProfileSuccess(true);
      setProfileEditMode(false);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (error) {
      setProfileError(error instanceof ApiError ? error.message : t("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    setMe(null);
    setFavorites([]);
    setEnrollments([]);
  }

  async function handleRemoveFavorite(id: number) {
    try {
      await removeFavorite(id);
      setFavorites((prev) => prev.filter((favorite) => favorite.id !== id));
    } catch {
      // silent
    }
  }

  if (me === "loading") {
    return (
      <div className="flex justify-center py-10">
        <p className="text-sm text-muted-foreground">{common("loading")}</p>
      </div>
    );
  }

  if (me === null) {
    return (
      <div className="mx-auto max-w-md">
        <div className="flex gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`px-4 py-2.5 text-sm font-medium ${
              tab === "login"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {t("loginTab")}
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`px-4 py-2.5 text-sm font-medium ${
              tab === "register"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {t("registerTab")}
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
            <FormGroup label={t("emailLabel")} required>
              <Input name="email" type="email" required autoComplete="email" />
            </FormGroup>
            <FormGroup label={t("passwordLabel")} required>
              <Input name="password" type="password" required autoComplete="current-password" />
            </FormGroup>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <Button type="submit" isLoading={isSubmitting}>
              {t("loginSubmit")}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="mt-6 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label={t("firstNameLabel")}>
                <Input name="first_name" autoComplete="given-name" />
              </FormGroup>
              <FormGroup label={t("lastNameLabel")}>
                <Input name="last_name" autoComplete="family-name" />
              </FormGroup>
            </div>
            <FormGroup label={t("emailLabel")} required>
              <Input name="email" type="email" required autoComplete="email" />
            </FormGroup>
            <FormGroup label={t("phoneLabel")}>
              <Input name="phone" type="tel" autoComplete="tel" />
            </FormGroup>
            <FormGroup label={t("passwordLabel")} required>
              <Input name="password" type="password" required autoComplete="new-password" />
            </FormGroup>
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <Button type="submit" isLoading={isSubmitting}>
              {t("registerSubmit")}
            </Button>
          </form>
        )}
      </div>
    );
  }

  const displayName = `${me.first_name} ${me.last_name}`.trim() || me.email;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-lg font-medium text-foreground">
            {t("welcome", { name: displayName })}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{me.email}</p>
          {me.profile.job_title || me.profile.company_name ? (
            <p className="text-sm text-muted-foreground">
              {[me.profile.job_title, me.profile.company_name].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <Button variant="secondary" size="sm" onClick={() => void handleLogout()}>
          {t("logout")}
        </Button>
      </div>

      {profileSuccess ? (
        <p
          role="status"
          className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm text-primary"
        >
          {t("updateSuccess")}
        </p>
      ) : null}

      <section className="rounded-xl border border-border p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t("profileHeading")}</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setProfileEditMode((previous) => !previous)}
          >
            {profileEditMode ? t("cancel") : t("editProfile")}
          </Button>
        </div>

        {!profileEditMode ? (
          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{t("firstNameLabel")}</dt>
              <dd className="font-medium text-foreground">{me.first_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("lastNameLabel")}</dt>
              <dd className="font-medium text-foreground">{me.last_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("phoneLabel")}</dt>
              <dd className="font-medium text-foreground">{me.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("jobTitleLabel")}</dt>
              <dd className="font-medium text-foreground">{me.profile.job_title || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">{t("bioLabel")}</dt>
              <dd className="font-medium text-foreground">{me.profile.bio || "—"}</dd>
            </div>
          </dl>
        ) : (
          <form onSubmit={handleProfileUpdate} className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormGroup label={t("firstNameLabel")}>
                <Input name="first_name" defaultValue={me.first_name} autoComplete="given-name" />
              </FormGroup>
              <FormGroup label={t("lastNameLabel")}>
                <Input name="last_name" defaultValue={me.last_name} autoComplete="family-name" />
              </FormGroup>
            </div>
            <FormGroup label={t("phoneLabel")}>
              <Input name="phone" type="tel" defaultValue={me.phone} autoComplete="tel" />
            </FormGroup>
            <FormGroup label={t("jobTitleLabel")}>
              <Input name="job_title" defaultValue={me.profile.job_title} />
            </FormGroup>
            <FormGroup label={t("companyLabel")}>
              <Input name="company_name" defaultValue={me.profile.company_name} />
            </FormGroup>
            <FormGroup label={t("bioLabel")}>
              <textarea
                name="bio"
                defaultValue={me.profile.bio}
                rows={3}
                className="flex w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
              />
            </FormGroup>
            {profileError ? (
              <p role="alert" className="text-sm text-destructive">
                {profileError}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="submit" isLoading={isSubmitting}>
                {t("save")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setProfileEditMode(false)}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">{t("enrollmentsHeading")}</h2>
        {enrollments.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("noEnrollments")}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {enrollments.map((enrollment) => (
              <li key={enrollment.public_id}>
                <Link
                  href={`/academy/${enrollment.course.slug}`}
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:border-primary"
                >
                  <span className="font-medium text-foreground">{enrollment.course.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {enrollment.progress_percent}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">{t("favoritesHeading")}</h2>
        {favorites.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("noFavorites")}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {favorites.map((favorite) => (
              <li
                key={favorite.id}
                className="flex items-center justify-between rounded-lg border border-border p-4 text-sm text-foreground"
              >
                <span>{favorite.target_title ?? favorite.content_type_label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleRemoveFavorite(favorite.id)}
                >
                  {t("remove")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
