"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError, addFavorite, getFavorites, getMe, removeFavorite } from "@/lib/api/client";

interface FavoriteButtonProps {
  contentType: string;
  publicId: string;
}

type Status = "checking" | "guest" | "favorited" | "not_favorited" | "submitting";

export function FavoriteButton({ contentType, publicId }: FavoriteButtonProps) {
  const t = useTranslations("common");
  const [status, setStatus] = useState<Status>("checking");
  const [favoriteId, setFavoriteId] = useState<number | null>(null);

  const check = useCallback(async () => {
    try {
      await getMe();
      const data = await getFavorites();
      const found = data.results.find(
        (fav) =>
          fav.content_type_label === contentType ||
          fav.content_type_label.includes(contentType),
      );
      // Backend returns favorites without content_type key; fallback: target_title match is not reliable.
      // Instead we search by matching request via trying to find by querying favorites that were added.
      // Since API does not return public_id, we store favoriteId only when we create.
      // For existing favorites we cannot reliably match; show generic state.
      // We use a heuristic: if any favorite exists we treat as not_favorited unless we just created.
      // Better: attempt to detect via separate endpoint is not available, so we keep simple.
      // We will track favoriteId after creation; on mount we cannot know, so default to not_favorited.
      // To improve, we fetch and try to infer via target_title is not workable.
      // So we simply show not_favorited initially; server will error on duplicate? Actually backend update_or_create returns 201 regardless.
      void found;
      setStatus("not_favorited");
    } catch (error) {
      const isGuest = error instanceof ApiError && (error.status === 401 || error.status === 403);
      setStatus(isGuest ? "guest" : "not_favorited");
    }
  }, [contentType]);

  useEffect(() => {
    void check();
  }, [check]);

  // Second attempt: precise check via iterating and trying to match by fetching each? Not available.
  // So we implement toggle based on favoriteId we own.

  async function handleToggle() {
    if (status === "guest" || status === "checking") return;
    setStatus("submitting");
    try {
      if (favoriteId !== null) {
        await removeFavorite(favoriteId);
        setFavoriteId(null);
        setStatus("not_favorited");
      } else {
        const created = await addFavorite(contentType, publicId);
        setFavoriteId(created.id);
        setStatus("favorited");
      }
    } catch (error) {
      const isGuest = error instanceof ApiError && (error.status === 401 || error.status === 403);
      if (isGuest) setStatus("guest");
      else setStatus(favoriteId ? "favorited" : "not_favorited");
    }
  }

  if (status === "checking") {
    return (
      <Button variant="secondary" size="sm" disabled aria-label={t("loading")}>
        <Heart className="size-4" aria-hidden />
      </Button>
    );
  }

  if (status === "guest") {
    return null;
  }

  const isFavorited = status === "favorited";

  return (
    <Button
      variant={isFavorited ? "secondary" : "secondary"}
      size="sm"
      onClick={() => void handleToggle()}
      disabled={status === "submitting"}
      aria-pressed={isFavorited}
      className={isFavorited ? "border-primary text-primary" : ""}
    >
      <Heart
        className={`size-4 ${isFavorited ? "fill-primary text-primary" : ""}`}
        aria-hidden
      />
      <span className="ms-1 hidden sm:inline">
        {isFavorited ? "ذخیره شده" : "ذخیره"}
      </span>
    </Button>
  );
}
