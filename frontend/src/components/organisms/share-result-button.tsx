"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ShareResultButton() {
  const t = useTranslations("ai");
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-5">
      <Button type="button" variant="secondary" onClick={copyShareLink}>
        {status === "copied" ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
        <span aria-live="polite">{status === "copied" ? t("linkCopied") : t("shareLink")}</span>
      </Button>
      {status === "error" ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {t("linkCopyError")}
        </p>
      ) : null}
    </div>
  );
}
