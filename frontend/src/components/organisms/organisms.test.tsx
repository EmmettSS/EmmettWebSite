import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdvisorLeadForm } from "@/components/organisms/advisor-lead-form";
import { CommentForm } from "@/components/organisms/comment-form";
import { ContactForm } from "@/components/organisms/contact-form";
import { CreativeAdvisorForm } from "@/components/organisms/creative-advisor-form";
import { EnrollButton } from "@/components/organisms/enroll-button";
import { Hero } from "@/components/organisms/hero";
import { NewsletterForm } from "@/components/organisms/newsletter-form";
import { ProjectEstimatorForm } from "@/components/organisms/project-estimator-form";
import { SearchBox } from "@/components/organisms/search-box";
import { ShareResultButton } from "@/components/organisms/share-result-button";
import { SiteFooter } from "@/components/organisms/site-footer";
import { SiteHeader } from "@/components/organisms/site-header";
import * as apiClient from "@/lib/api/client";
import type { AIConcept, Catalog } from "@/lib/api/types";

const pushMock = vi.fn();

vi.mock("next-intl", () => ({
  useLocale: () => "fa",
  useTranslations: () => (key: string) => key,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/",
  useRouter: () => ({ push: pushMock }),
}));

const sampleCatalogs: Catalog[] = [
  { key: "project_type", label: "Project Type", options: [{ key: "web", label: "Web", order: 1 }] },
  {
    key: "budget_range",
    label: "Budget",
    options: [{ key: "not_sure", label: "Not sure", order: 1 }],
  },
  {
    key: "timeline",
    label: "Timeline",
    options: [{ key: "flexible", label: "Flexible", order: 1 }],
  },
  { key: "job_role", label: "Role", options: [{ key: "cto", label: "CTO", order: 1 }] },
  { key: "business_size", label: "Size", options: [{ key: "sme", label: "SME", order: 1 }] },
  {
    key: "city_scale",
    label: "City",
    options: [{ key: "metropolis", label: "Metropolis", order: 1 }],
  },
  { key: "team_size", label: "Team", options: [{ key: "small", label: "Small", order: 1 }] },
  {
    key: "goal",
    label: "Goal",
    options: [
      { key: "automation", label: "Automation", order: 1 },
      { key: "growth", label: "Growth", order: 2 },
    ],
  },
  {
    key: "delivery_scope",
    label: "Scope",
    options: [{ key: "mvp", label: "MVP", order: 1 }],
  },
];

const sampleConcept: AIConcept = {
  public_id: "c1",
  position: 1,
  title: "Idea 1",
  description: "Description",
  benefit: "Benefit",
  solution_area: { key: "web", label: "Web" },
  complexity: { key: "medium", label: "Medium" },
  delivery_scope: { key: "mvp", label: "MVP" },
  minimum_working_days: 20,
  related_item: null,
};

describe("Organisms", () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.restoreAllMocks();
  });

  it("renders Hero, SiteFooter, and SiteHeader with mobile menu toggle", () => {
    render(
      <div>
        <SiteHeader />
        <Hero />
        <SiteFooter />
      </div>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "headline" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Footer" })).toBeInTheDocument();

    const menuButton = screen.getByRole("button", { name: "openMenu" });
    fireEvent.click(menuButton);
    expect(screen.getByRole("button", { name: "closeMenu" })).toBeInTheDocument();
  });

  it("submits SearchBox with trimmed query and empty query", () => {
    const { unmount } = render(<SearchBox initialQuery="  django  " />);
    const input = screen.getByPlaceholderText("placeholder");
    fireEvent.change(input, { target: { value: "  nextjs  " } });
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);
    expect(pushMock).toHaveBeenCalledWith("/search?q=nextjs");
    unmount();

    render(<SearchBox initialQuery="   " />);
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);
    expect(pushMock).toHaveBeenCalledWith("/search");
  });

  it("submits NewsletterForm and handles both error and success states", async () => {
    vi.spyOn(apiClient, "subscribeNewsletter").mockRejectedValueOnce(new Error("fail"));
    render(<NewsletterForm />);

    const input = screen.getByPlaceholderText("newsletterPlaceholder");
    fireEvent.change(input, { target: { value: "news@example.com" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "newsletterSubmit" })).toBeInTheDocument();
    });

    vi.spyOn(apiClient, "subscribeNewsletter").mockResolvedValueOnce({ detail: "ok" });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("newsletterSuccess")).toBeInTheDocument();
    });
  });

  it("copies share link in ShareResultButton and handles clipboard error", async () => {
    const writeText = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ShareResultButton />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("linkCopied")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(screen.getByText("linkCopyError")).toBeInTheDocument();
    });
  });

  it("handles ContactForm unavailable catalogs, submission success, and API error", async () => {
    const { unmount } = render(<ContactForm catalogs={null} />);
    expect(screen.getByText("catalogUnavailable")).toBeInTheDocument();
    unmount();

    vi.spyOn(apiClient, "submitContactForm").mockRejectedValueOnce(
      new apiClient.ApiError("Rate limited", 429),
    );
    render(<ContactForm catalogs={sampleCatalogs} />);
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Rate limited");
    });

    vi.spyOn(apiClient, "submitContactForm").mockResolvedValueOnce({
      public_id: "c1",
      name: "Ali",
      created_at: "2026-01-01",
    });
    fireEvent.submit(screen.getByRole("button", { name: "submit" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("success")).toBeInTheDocument();
    });
  });

  it("handles CreativeAdvisorForm, ProjectEstimatorForm, and AdvisorLeadForm", async () => {
    const { unmount: u1 } = render(<CreativeAdvisorForm catalogs={null} />);
    expect(screen.getByText("catalogUnavailable")).toBeInTheDocument();
    u1();

    vi.spyOn(apiClient, "createAdvisorSuggestion").mockResolvedValueOnce({
      share_token: "share-xyz",
      suggestion: {
        public_id: "s1",
        locale: "fa",
        concepts: [],
      },
    });

    const { unmount: u2 } = render(<CreativeAdvisorForm catalogs={sampleCatalogs} />);
    fireEvent.submit(screen.getByRole("button", { name: "generateIdeas" }).closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent("goalsRequired");

    fireEvent.click(screen.getByLabelText("Automation"));
    fireEvent.submit(screen.getByRole("button", { name: "generateIdeas" }).closest("form")!);
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/advisor/results/share-xyz");
    });
    u2();

    const { unmount: u3a } = render(<ProjectEstimatorForm catalogs={null} />);
    expect(screen.getByText("catalogUnavailable")).toBeInTheDocument();
    u3a();

    vi.spyOn(apiClient, "estimateProject")
      .mockRejectedValueOnce(new apiClient.ApiError("Estimate failed", 400))
      .mockResolvedValueOnce({
        delivery_scope: "mvp",
        delivery_scope_label: "MVP",
        minimum_working_days: null,
      })
      .mockResolvedValueOnce({
        delivery_scope: "mvp",
        delivery_scope_label: "MVP",
        minimum_working_days: 25,
      });
    const { unmount: u3 } = render(<ProjectEstimatorForm catalogs={sampleCatalogs} />);
    fireEvent.submit(screen.getByRole("button", { name: "estimateProject" }).closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent("goalsRequired");

    const goalBox = screen.getByLabelText("Automation");
    fireEvent.click(goalBox);
    fireEvent.click(goalBox);
    fireEvent.click(goalBox);

    fireEvent.submit(screen.getByRole("button", { name: "estimateProject" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Estimate failed");
    });

    fireEvent.submit(screen.getByRole("button", { name: "estimateProject" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("estimateUnavailable")).toBeInTheDocument();
    });

    fireEvent.submit(screen.getByRole("button", { name: "estimateProject" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("estimateResultTitle")).toBeInTheDocument();
    });
    u3();

    const { unmount: u4a } = render(
      <AdvisorLeadForm token="share-xyz" concept={sampleConcept} catalogs={null} />,
    );
    expect(screen.getByText("catalogUnavailable")).toBeInTheDocument();
    u4a();

    vi.spyOn(apiClient, "submitAdvisorLead")
      .mockRejectedValueOnce(new apiClient.ApiError("Lead error", 400))
      .mockResolvedValueOnce({
        public_id: "l1",
        name: "Ali",
        created_at: "2026-01-01",
      });
    render(<AdvisorLeadForm token="share-xyz" concept={sampleConcept} catalogs={sampleCatalogs} />);
    fireEvent.submit(screen.getByRole("button", { name: "requestReview" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Lead error");
    });

    fireEvent.submit(screen.getByRole("button", { name: "requestReview" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("leadSuccess")).toBeInTheDocument();
    });
  });

  it("handles EnrollButton guest and authenticated enrollment flows", async () => {
    vi.spyOn(apiClient, "getMe").mockRejectedValueOnce(new apiClient.ApiError("Forbidden", 403));
    const { unmount } = render(<EnrollButton courseSlug="python-101" />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "enrollRequiresLogin" })).toBeInTheDocument();
    });
    unmount();

    vi.spyOn(apiClient, "getMe").mockResolvedValueOnce({
      public_id: "u1",
      email: "a@b.com",
      first_name: "A",
      last_name: "B",
      phone: "",
      role: "student",
      is_phone_verified: false,
      profile: {
        bio: "",
        job_title: "",
        company_name: "",
        locale_preference: "fa",
        avatar_url: null,
      },
    });
    vi.spyOn(apiClient, "getEnrollments").mockResolvedValueOnce({
      count: 0,
      total_pages: 1,
      current_page: 1,
      next: null,
      previous: null,
      results: [],
    });
    vi.spyOn(apiClient, "enrollInCourse").mockResolvedValueOnce({
      public_id: "e1",
      status: "active",
      progress_percent: 0,
      enrolled_at: "2026-01-01",
      completed_at: null,
      course: {
        public_id: "c1",
        title: "Python",
        slug: "python-101",
        summary: "",
        level: "beginner",
      },
    });

    render(<EnrollButton courseSlug="python-101" />);
    const btn = await screen.findByRole("button", { name: "enroll" });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "enrolled" })).toBeDisabled();
    });
  });

  it("handles CommentForm for guest and authenticated user", async () => {
    vi.spyOn(apiClient, "getMe").mockRejectedValueOnce(new apiClient.ApiError("Forbidden", 403));
    const { unmount } = render(<CommentForm postSlug="intro-post" />);
    await waitFor(() => {
      expect(screen.getByText("commentLoginRequired")).toBeInTheDocument();
    });
    unmount();

    vi.spyOn(apiClient, "getMe").mockResolvedValueOnce({
      public_id: "u1",
      email: "a@b.com",
      first_name: "A",
      last_name: "B",
      phone: "",
      role: "student",
      is_phone_verified: false,
      profile: {
        bio: "",
        job_title: "",
        company_name: "",
        locale_preference: "fa",
        avatar_url: null,
      },
    });
    vi.spyOn(apiClient, "addComment").mockResolvedValueOnce({ id: 1 });

    render(<CommentForm postSlug="intro-post" />);
    const textarea = await screen.findByPlaceholderText("commentPlaceholder");
    fireEvent.change(textarea, { target: { value: "Great post!" } });
    fireEvent.submit(textarea.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("commentPending")).toBeInTheDocument();
    });
  });
});
