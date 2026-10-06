import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addComment,
  addFavorite,
  ApiError,
  createAdvisorSuggestion,
  enrollInCourse,
  ensureCsrfCookie,
  estimateProject,
  getEnrollments,
  getFavorites,
  getMe,
  globalSearch,
  login,
  logout,
  register,
  removeFavorite,
  submitAdvisorLead,
  submitContactForm,
  subscribeNewsletter,
  updateMe,
} from "./client";
import { getApiBaseUrl } from "./config";
import {
  getFaqForPath,
  getSeoRedirects,
  getSeoSettings,
  getSeoSettingsOrDefaults,
  getSitemapEntries,
  toAbsoluteMediaUrl,
} from "./seo";
import {
  getBlogPost,
  getBlogPosts,
  getCatalogs,
  getCourse,
  getCourses,
  getProject,
  getProjects,
  getService,
  getServices,
  getSharedAISuggestion,
  getTeamMembers,
  getTestimonials,
  searchSite,
} from "./server";

describe("lib/api/config", () => {
  it("returns relative /api/v1 in browser and internal URL on server", () => {
    expect(getApiBaseUrl()).toBe("/api/v1");

    const origWindow = globalThis.window;
    // @ts-expect-error testing server environment without window
    delete globalThis.window;
    process.env.INTERNAL_API_URL = "http://127.0.0.1:8000";
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:8000/api/v1");
    globalThis.window = origWindow;
  });
});

describe("lib/api/client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "csrftoken=test-csrf-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("fetches CSRF cookie when csrftoken is missing", async () => {
    document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "ok" }), { status: 200 }),
    );
    await ensureCsrfCookie();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/csrf/", { credentials: "include" });
  });

  it("handles auth, favorites, enrollment, contact, AI, newsletter, comment, and search calls", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true, results: [] }), { status: 200 })),
    );

    await register({ email: "a@b.com", password: "secret" });
    await login({ email: "a@b.com", password: "secret" });
    await getMe();
    await updateMe({ first_name: "Ali" });
    await getFavorites();
    await addFavorite("blog.blogpost", "uuid-1");
    await getEnrollments();
    await enrollInCourse("django-pro");
    await submitContactForm({
      name: "Ali",
      email: "a@b.com",
      project_type: "web",
      budget_range: "mid",
      timeline: "normal",
      message: "Hello",
      consent_given: true,
    });
    await createAdvisorSuggestion(
      {
        job_role: "cto",
        business_size: "sme",
        city_scale: "metropolis",
        budget_range: "mid",
        team_size: "small",
        goals: ["automation"],
      },
      "fa",
    );
    await estimateProject(
      {
        job_role: "cto",
        business_size: "sme",
        city_scale: "metropolis",
        budget_range: "mid",
        team_size: "small",
        goals: ["automation"],
        delivery_scope: "mvp",
      },
      "en",
    );
    await submitAdvisorLead(
      {
        share_token: "tok",
        concept_public_id: "cid",
        contact: {
          name: "Ali",
          email: "a@b.com",
          phone: "",
          project_type: "web",
          budget_range: "mid",
          timeline: "normal",
          message: "Hi",
          consent_given: true,
        },
      },
      "fa",
    );
    await subscribeNewsletter({ email: "sub@b.com", locale_preference: "fa" });
    await addComment("post-1", "Nice article");
    await globalSearch("django", "fa");

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await logout();

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await removeFavorite(1);

    expect(fetchMock).toHaveBeenCalled();
  });

  it("throws ApiError on non-OK JSON and non-JSON responses", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Invalid credentials" }), { status: 401 }),
    );
    await expect(getMe()).rejects.toThrow(ApiError);

    fetchMock.mockResolvedValueOnce(new Response("Bad Gateway", { status: 502 }));
    await expect(getMe()).rejects.toMatchObject({ status: 502 });
  });
});

describe("lib/api/server & lib/api/seo", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("fetches server resources and returns null on failure", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ results: [] }), { status: 200 })),
    );

    expect(await getServices("fa")).toEqual({ results: [] });
    expect(await getService("fa", "web")).toEqual({ results: [] });
    expect(await getProjects("fa", "is_product=true")).toEqual({ results: [] });
    expect(await getProjects("fa")).toEqual({ results: [] });
    expect(await getProject("en", "crm")).toEqual({ results: [] });
    expect(await getCourses("fa", "level=beginner")).toEqual({ results: [] });
    expect(await getCourses("fa")).toEqual({ results: [] });
    expect(await getCourse("fa", "python")).toEqual({ results: [] });
    expect(await getBlogPosts("fa", "page=2")).toEqual({ results: [] });
    expect(await getBlogPosts("fa")).toEqual({ results: [] });
    expect(await getBlogPost("fa", "intro")).toEqual({ results: [] });
    expect(await getTeamMembers("fa")).toEqual({ results: [] });
    expect(await getTestimonials("fa", true)).toEqual({ results: [] });
    expect(await getTestimonials("fa")).toEqual({ results: [] });
    expect(await searchSite("fa", "django")).toEqual({ results: [] });
    expect(await getCatalogs("fa", ["job_role"])).toEqual({ results: [] });
    expect(await getCatalogs("fa")).toEqual({ results: [] });
    expect(await getSharedAISuggestion("fa", "tok-123")).toEqual({ results: [] });

    fetchMock.mockResolvedValueOnce(new Response("Not found", { status: 404 }));
    expect(await getService("fa", "missing")).toBeNull();

    fetchMock.mockResolvedValueOnce(new Response("Not found", { status: 404 }));
    expect(await getSharedAISuggestion("fa", "revoked")).toBeNull();

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    expect(await getServices("fa")).toBeNull();

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    expect(await getSharedAISuggestion("fa", "err")).toBeNull();
  });

  it("fetches SEO settings, sitemap, redirects, FAQ, and fallbacks gracefully", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            site_name: "Emmett Pro",
            results: [{ path: "/about" }],
          }),
          { status: 200 },
        ),
      ),
    );

    expect((await getSeoSettings())?.site_name).toBe("Emmett Pro");
    expect(await getSitemapEntries()).toHaveLength(1);
    expect(await getSeoRedirects()).toHaveLength(1);
    expect(await getFaqForPath("/services", "fa")).toHaveLength(1);

    fetchMock.mockResolvedValueOnce(new Response("err", { status: 500 }));
    const defaults = await getSeoSettingsOrDefaults();
    expect(defaults.site_name).toBe("Emmett");
    expect(defaults.default_locale).toBe("fa");

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await getSitemapEntries()).toEqual([]);

    expect(toAbsoluteMediaUrl(null, "https://emmett.ir")).toBeNull();
    expect(toAbsoluteMediaUrl("https://cdn.emmett.ir/a.png", "https://emmett.ir")).toBe(
      "https://cdn.emmett.ir/a.png",
    );
    expect(toAbsoluteMediaUrl("/media/a.png", "https://emmett.ir/")).toBe(
      "https://emmett.ir/media/a.png",
    );
    expect(toAbsoluteMediaUrl("media/a.png", "https://emmett.ir")).toBe(
      "https://emmett.ir/media/a.png",
    );
  });
});
