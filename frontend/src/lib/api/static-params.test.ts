import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchCatalogPage } from "@/lib/api/client";
import { getCategories, getTags } from "@/lib/api/server";
import {
  blogDetailParams,
  courseDetailParams,
  projectDetailParams,
  serviceDetailParams,
} from "@/lib/api/static-params";

describe("Static params & taxonomy API helpers", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("builds detail static params across locales and falls back to empty when offline", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ results: [{ slug: "alpha" }] }), { status: 200 }),
      ),
    );

    expect(await serviceDetailParams()).toEqual([
      { locale: "fa", slug: "alpha" },
      { locale: "en", slug: "alpha" },
    ]);
    expect(await projectDetailParams()).toHaveLength(2);
    expect(await courseDetailParams()).toHaveLength(2);
    expect(await blogDetailParams()).toHaveLength(2);

    fetchMock.mockImplementation(() => Promise.resolve(new Response("down", { status: 503 })));
    expect(await serviceDetailParams()).toEqual([]);
  });

  it("fetches categories, tags, and client catalog pages with cache tags and locale headers", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ results: [] }), { status: 200 })),
    );

    await getCategories("fa", "service");
    await getCategories("en");
    await getTags("fa");
    await fetchCatalogPage("/services/", "categories__slug=security", "en");
    await fetchCatalogPage("/services/", "", "fa");

    const scopedOpts = fetchMock.mock.calls[0]?.[1] as RequestInit & { next?: { tags?: string[] } };
    const unscopedOpts = fetchMock.mock.calls[1]?.[1] as RequestInit & {
      next?: { tags?: string[] };
    };
    expect(scopedOpts.next?.tags).toEqual(["content:services"]);
    expect(unscopedOpts.next?.tags).toHaveLength(4);
    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/v1/services/?categories__slug=security");
    expect(fetchMock.mock.calls[4]?.[0]).toBe("/api/v1/services/");
  });
});
