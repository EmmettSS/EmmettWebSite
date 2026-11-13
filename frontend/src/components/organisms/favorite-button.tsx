"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await getMe();
        const data = await getFavorites();
        if (cancelled) return;
        const found = data.results.find((fav) => fav.target_public_id === publicId);
        if (found) {
          setFavoriteId(found.id);
          setStatus("favorited");
        } else {
          setFavoriteId(null);
          setStatus("not_favorited");
        }
      } catch (error) {
        if (cancelled) return;
        const isGuest = error instanceof ApiError && (error.status === 401 || error.status === 403);
        setStatus(isGuest ? "guest" : "not_favorited");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [publicId]);

  async function handleToggle() {
    if (status === "guest" || status === "checking" || status === "submitting") return;
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
      else setStatus(favoriteId !== null ? "favorited" : "not_favorited");
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
  const label = isFavorited ? t("savedItem") : t("saveItem");

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => void handleToggle()}
      disabled={status === "submitting"}
      aria-pressed={isFavorited}
      aria-label={label}
      className={isFavorited ? "border-primary text-primary" : ""}
    >
      <Heart className={`size-4 ${isFavorited ? "fill-primary text-primary" : ""}`} aria-hidden />
      <span className="ms-1 hidden sm:inline">{label}</span>
    </Button>
  );
}
