"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { FormGroup } from "@/components/molecules/form-group";
import type { Catalog, CatalogOption } from "@/lib/api/types";

interface AIProjectContextFieldsProps {
  catalogs: Catalog[];
}

function catalogOptions(catalogs: Catalog[], key: string): CatalogOption[] {
  return catalogs.find((catalog) => catalog.key === key)?.options ?? [];
}

export function AIProjectContextFields({ catalogs }: AIProjectContextFieldsProps) {
  const t = useTranslations("ai");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const selectClassName =
    "flex h-11 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors duration-fast ease-emmett-standard focus-visible:border-primary focus-visible:bg-secondary/30 focus-visible:outline-none";

  const selectFields = [
    { key: "job_role", name: "job_role", label: t("jobRoleLabel") },
    { key: "business_size", name: "business_size", label: t("businessSizeLabel") },
    { key: "city_scale", name: "city_scale", label: t("cityScaleLabel") },
    { key: "budget_range", name: "budget_range", label: t("budgetLabel") },
    { key: "team_size", name: "team_size", label: t("teamSizeLabel") },
  ] as const;

  return (
    <>
      {selectFields.map((field) => {
        const options = catalogOptions(catalogs, field.key);
        const defaultKey = field.key === "budget_range" ? "not_sure" : undefined;
        return (
          <FormGroup key={field.key} label={field.label} required>
            <select
              name={field.name}
              required
              defaultValue={options.find((option) => option.key === defaultKey)?.key ?? options[0]?.key ?? ""}
              className={selectClassName}
            >
              {options.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormGroup>
        );
      })}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">
          {t("goalsLabel")} <span aria-hidden="true" className="ms-1 text-destructive">*</span>
        </legend>
        <p id="ai-goals-hint" className="text-xs text-muted-foreground">
          {t("goalsHint")}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {catalogOptions(catalogs, "goal").map((option) => {
            const checked = selectedGoals.includes(option.key);
            const disabled = selectedGoals.length >= 5 && !checked;
            return (
              <label
                key={option.key}
                className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3 py-2 text-sm text-foreground has-[:focus-visible]:border-primary"
              >
                <input
                  type="checkbox"
                  name="goals"
                  value={option.key}
                  checked={checked}
                  disabled={disabled}
                  aria-describedby="ai-goals-hint"
                  onChange={(event) => {
                    setSelectedGoals((current) =>
                      event.currentTarget.checked
                        ? [...current, option.key]
                        : current.filter((key) => key !== option.key),
                    );
                  }}
                  className="size-4 accent-primary"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}
