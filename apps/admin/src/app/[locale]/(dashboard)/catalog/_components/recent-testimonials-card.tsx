"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@tge/ui";

import { Link } from "@/i18n/navigation";
import { RecentList } from "@/components/shared/recent-list";
import { SectionCard } from "@/components/shared/section-card";
import type { RecentTestimonialEntry } from "@tge/types";

interface Props {
  items: RecentTestimonialEntry[];
  isLoading: boolean;
}

function RatingPill({ rating }: { rating: number }) {
  return (
    <span
      className="mono inline-flex items-center gap-0.5 rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] tabular-nums"
      aria-label={`rating ${rating} of 5`}
    >
      <Star className="h-3 w-3 text-copper" />
      {rating}
    </span>
  );
}

export function RecentTestimonialsCard({ items, isLoading }: Props) {
  const t = useTranslations("Catalog.home.recent");

  return (
    <SectionCard
      title={t("testimonialsTitle")}
      headerActions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/testimonials">
            {t("viewAll")}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      }
    >
      <RecentList
        items={items.map((row) => ({
          id: row.id,
          href: `/testimonials/${row.id}/edit`,
          title: row.clientName,
          badges: <RatingPill rating={row.rating} />,
          timestamp: row.createdAt,
        }))}
        loading={isLoading}
        emptyLabel={t("empty")}
      />
    </SectionCard>
  );
}
