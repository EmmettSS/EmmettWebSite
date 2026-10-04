import { useId, type ReactElement, cloneElement } from "react";

import { cn } from "@/lib/utils";

interface FormGroupProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-required"?: boolean }>;
}

/**
 * ترکیب label + فیلد + پیام خطا/راهنما با سیم‌کشی صحیح `aria-describedby`
 * (قانون ۱۸). هیچ رشتهٔ ثابتی اینجا نیست — همهٔ متن‌ها از next-intl می‌آیند.
 */
export function FormGroup({ label, htmlFor, error, hint, required, className, children }: FormGroupProps) {
  const generatedId = useId();
  const fieldId = htmlFor ?? generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span aria-hidden="true" className="ms-1 text-destructive">
            *
          </span>
        ) : null}
      </label>

      {cloneElement(children, {
        id: fieldId,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
