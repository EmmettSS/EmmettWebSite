"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { fetchCatalogPage } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/types";

export interface CatalogParamMap {
  urlParam: string;
  apiParam: string;
  onlyValue?: string;
}

export function buildCatalogApiQuery(
  rawParams: URLSearchParams,
  mappings: readonly CatalogParamMap[],
  fixedParams?: Readonly<Record<string, string>>,
): { apiQuery: string; filterParams: Record<string, string>; hasUserQuery: boolean } {
  const apiParams = new URLSearchParams();
  if (fixedParams) {
    for (const [key, value] of Object.entries(fixedParams)) {
      apiParams.set(key, value);
    }
  }

  const filterParams: Record<string, string> = {};
  let hasUserQuery = false;

  const page = rawParams.get("page")?.trim() ?? "";
  if (page && page !== "1") {
    apiParams.set("page", page);
    hasUserQuery = true;
  }

  for (const { urlParam, apiParam, onlyValue } of mappings) {
    const value = rawParams.get(urlParam)?.trim() ?? "";
    if (!value || (onlyValue && value !== onlyValue)) continue;
    apiParams.set(apiParam, value);
    filterParams[urlParam] = value;
    hasUserQuery = true;
  }

  return {
    apiQuery: apiParams.toString(),
    filterParams,
    hasUserQuery,
  };
}

interface UseCatalogQueryOptions<T> {
  endpointPath: string;
  locale: string;
  initialData: Paginated<T> | null;
  mappings: readonly CatalogParamMap[];
  fixedParams?: Readonly<Record<string, string>>;
}

export function useCatalogQuery<T>({
  endpointPath,
  locale,
  initialData,
  mappings,
  fixedParams,
}: UseCatalogQueryOptions<T>): {
  data: Paginated<T> | null;
  filterParams: Record<string, string>;
  isLoading: boolean;
} {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.toString();

  const { apiQuery, filterParams, hasUserQuery } = useMemo(
    () => buildCatalogApiQuery(new URLSearchParams(rawQuery), mappings, fixedParams),
    [rawQuery, mappings, fixedParams],
  );

  const [fetched, setFetched] = useState<{ key: string; data: Paginated<T> | null } | null>(null);
  const requestKey = `${locale}:${endpointPath}?${apiQuery}`;

  useEffect(() => {
    if (!hasUserQuery) return;
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetchCatalogPage<T>(
          endpointPath,
          apiQuery,
          locale,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setFetched({ key: requestKey, data: response });
        }
      } catch {
        if (!controller.signal.aborted) {
          setFetched({ key: requestKey, data: null });
        }
      }
    }

    void load();
    return () => {
      controller.abort();
    };
  }, [hasUserQuery, endpointPath, apiQuery, locale, requestKey]);

  if (!hasUserQuery) {
    return { data: initialData, filterParams, isLoading: false };
  }

  if (fetched?.key === requestKey) {
    return { data: fetched.data, filterParams, isLoading: false };
  }

  return { data: initialData, filterParams, isLoading: true };
}
