import { render, screen } from "@testing-library/react";
import { Sparkles } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { JsonLd } from "@/components/seo/json-ld";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ "x-nonce": "test-nonce-123" })),
}));

describe("UI Atoms & SEO JsonLd Component", () => {
  it("renders Badge variants, Skeleton, Input, and Avatar", () => {
    render(
      <div>
        <Badge variant="neutral">Neutral</Badge>
        <Badge variant="accent">Accent</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="technical">TECH</Badge>
        <Skeleton data-testid="skel" />
        <Input placeholder="Enter text" />
        <Avatar>
          <AvatarImage src="/avatar.png" alt="User" />
          <AvatarFallback>EM</AvatarFallback>
        </Avatar>
      </div>,
    );

    expect(screen.getByText("Neutral")).toBeInTheDocument();
    expect(screen.getByText("TECH")).toBeInTheDocument();
    expect(screen.getByTestId("skel")).toHaveAttribute("data-slot", "skeleton");
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
    expect(screen.getByText("EM")).toBeInTheDocument();
  });

  it("renders Icon as aria-hidden when decorative and role=img when labeled", () => {
    const { container } = render(
      <div>
        <Icon icon={Sparkles} size="sm" />
        <Icon icon={Sparkles} size="lg" label="AI Sparkles" />
      </div>,
    );

    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "AI Sparkles" })).toBeInTheDocument();
  });

  it("renders JsonLd script with nonce and escapes < characters", async () => {
    const nullResult = await JsonLd({ data: null });
    expect(nullResult).toBeNull();

    const element = await JsonLd({
      data: {
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebSite", name: "Emmett <script>" }],
      },
    });
    const { container } = render(element);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
    expect(script?.getAttribute("nonce")).toBe("test-nonce-123");
    expect(script?.innerHTML).toContain("\\u003cscript>");
  });
});
