"use client";

import { useTranslations } from "next-intl";
import type { ApiTestimonial } from "@tge/types";
import { BilingualView } from "@/components/shared/bilingual-view";
import {
  DetailLayout,
  DetailMetaCard,
  MetaRow,
} from "@/components/shared/detail-layout";

interface TestimonialDetailViewProps {
  testimonial: ApiTestimonial;
}

export function TestimonialDetailView({
  testimonial,
}: TestimonialDetailViewProps) {
  const t = useTranslations("TestimonialForm");
  const tc = useTranslations("Common");

  return (
    <DetailLayout
      main={
        <div className="rounded-md border border-border bg-card p-5">
          <BilingualView
            label={t("quote")}
            valueEn={testimonial.quote?.en}
            valueRo={testimonial.quote?.ro}
            valueFr={testimonial.quote?.fr}
            valueDe={testimonial.quote?.de}
            multiline
          />
        </div>
      }
      meta={
        <DetailMetaCard title={tc("meta")}>
          <MetaRow label={t("clientName")} value={testimonial.clientName} />
          <MetaRow
            label={t("location")}
            value={testimonial.location || null}
          />
          <MetaRow
            label={t("propertyType")}
            value={testimonial.propertyType || null}
          />
          <MetaRow
            label={t("rating")}
            value={t("star", { count: testimonial.rating })}
          />
        </DetailMetaCard>
      }
    />
  );
}
