"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, Share2, Check } from "lucide-react";
import { Button } from "@tge/ui";

interface PropertyHeaderProps {
  title: string;
  slug: string;
}

const FAVORITES_KEY = "reveria:favorites";

function readFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeFavorites(list: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch {
    // ignore quota errors
  }
}

export function PropertyHeader({ title, slug }: PropertyHeaderProps) {
  const t = useTranslations("PropertyDetail");
  const [isSaved, setIsSaved] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    setIsSaved(readFavorites().includes(slug));
  }, [slug]);

  const toggleSave = () => {
    const current = readFavorites();
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    writeFavorites(next);
    setIsSaved(next.includes(slug));
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground flex-1 min-w-0">
        {title}
      </h1>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleSave}
          aria-pressed={isSaved}
          className={isSaved ? "border-primary text-primary" : ""}
        >
          <Bookmark
            className={`h-4 w-4 ${isSaved ? "fill-primary" : ""}`}
          />
          <span className="ml-1.5">{t("save")}</span>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={share}>
          {shared ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          <span className="ml-1.5">{t("share")}</span>
        </Button>
      </div>
    </div>
  );
}
