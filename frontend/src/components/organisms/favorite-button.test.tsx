import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FavoriteButton } from "@/components/organisms/favorite-button";
import * as apiClient from "@/lib/api/client";
import type { Favorite, Me } from "@/lib/api/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const sampleMe: Me = {
  public_id: "u1",
  email: "user@emmett.dev",
  first_name: "Ali",
  last_name: "Rezaei",
  phone: "",
  role: "client",
  is_phone_verified: false,
  profile: {
    avatar_url: null,
    bio: "",
    locale_preference: "fa",
    job_title: "",
    company_name: "",
  },
};

const sampleFavorite: Favorite = {
  id: 42,
  content_type_label: "service",
  object_id: 1,
  target_title: "Web Development",
  target_public_id: "pub-123",
  target_slug: "web-development",
  created_at: "2026-11-13T00:00:00Z",
};

describe("FavoriteButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("hides button for unauthenticated guests", async () => {
    vi.spyOn(apiClient, "getMe").mockRejectedValueOnce(new apiClient.ApiError("Unauthorized", 401));
    const { container } = render(<FavoriteButton contentType="service" publicId="pub-123" />);
    expect(screen.getByRole("button", { name: "loading" })).toBeDisabled();
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("toggles favorite add and remove and handles server errors", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValueOnce(sampleMe);
    vi.spyOn(apiClient, "getFavorites").mockResolvedValueOnce({
      count: 0,
      total_pages: 1,
      current_page: 1,
      next: null,
      previous: null,
      results: [],
    });
    const addSpy = vi.spyOn(apiClient, "addFavorite").mockResolvedValueOnce(sampleFavorite);
    const removeSpy = vi
      .spyOn(apiClient, "removeFavorite")
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce(undefined);

    render(<FavoriteButton contentType="service" publicId="pub-123" />);

    const saveBtn = await screen.findByRole("button", { name: "saveItem" });
    expect(saveBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(saveBtn);
    const savedBtn = await screen.findByRole("button", { name: "savedItem" });
    expect(addSpy).toHaveBeenCalledWith("service", "pub-123");
    expect(savedBtn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(savedBtn);
    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: "savedItem" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "savedItem" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "saveItem" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
  });

  it("detects already-favorited item on mount and handles session expiry on toggle", async () => {
    vi.spyOn(apiClient, "getMe").mockResolvedValueOnce(sampleMe);
    vi.spyOn(apiClient, "getFavorites").mockResolvedValueOnce({
      count: 1,
      total_pages: 1,
      current_page: 1,
      next: null,
      previous: null,
      results: [sampleFavorite],
    });
    vi.spyOn(apiClient, "removeFavorite").mockRejectedValueOnce(
      new apiClient.ApiError("Forbidden", 403),
    );

    const { container } = render(<FavoriteButton contentType="service" publicId="pub-123" />);
    const savedBtn = await screen.findByRole("button", { name: "savedItem" });
    expect(savedBtn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(savedBtn);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
