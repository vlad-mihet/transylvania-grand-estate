"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";

import { useEmailOverlap } from "@/lib/people/use-people-overview";

export function OverlapCallout() {
  const t = useTranslations("People.home.overlap");
  const { count, isLoading, isEnabled } = useEmailOverlap();

  // Hidden when the caller can only see one pool — overlap detection is
  // meaningless without at least two pools to intersect.
  if (!isEnabled) return null;
  // Once data has settled and there's no overlap, hide the card to avoid
  // dashboard noise. (We deliberately skip a "0 overlap" pill — admins can
  // infer absence from absence.)
  if (!isLoading && count === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-md border border-copper/20 bg-[color-mix(in_srgb,var(--color-copper)_4%,transparent)] px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-copper/15 text-copper">
        <Users className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{t("title")}</p>
        {isLoading ? (
          <div className="mt-1 h-3 w-40 animate-pulse rounded-sm bg-muted" />
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("body", { count })}
          </p>
        )}
      </div>
    </div>
  );
}
