"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  label: string;
  paramName: string;
  options: FilterOption[];
  allLabel: string;
}

export function FilterBar({ label, paramName, options, allLabel }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeValue = searchParams.get(paramName) ?? "";

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(paramName, value);
      else params.delete(paramName);
      params.delete("page");
      const query = params.toString();
      router.push((query ? `${pathname}?${query}` : pathname) as "/services");
    },
    [router, pathname, searchParams, paramName],
  );

  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => handleChange("")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            !activeValue
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-transparent text-muted-foreground hover:border-primary hover:text-foreground"
          }`}
        >
          {allLabel}
        </button>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleChange(option.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeValue === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SearchInputFilterProps {
  placeholder: string;
  label?: string;
}

export function SearchInputFilter({ placeholder, label }: SearchInputFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get("search") ?? "";

  const handleChange = useCallback(
    (newValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newValue.trim()) params.set("search", newValue.trim());
      else params.delete("search");
      params.delete("page");
      const query = params.toString();
      router.push((query ? `${pathname}?${query}` : pathname) as "/services");
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex items-center gap-2">
      {label ? (
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      ) : null}
      <input
        type="search"
        defaultValue={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleChange(event.currentTarget.value);
        }}
        onBlur={(event) => {
          if (event.currentTarget.value !== value) handleChange(event.currentTarget.value);
        }}
        className="h-9 w-56 rounded-md border border-input bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
      />
    </div>
  );
}
