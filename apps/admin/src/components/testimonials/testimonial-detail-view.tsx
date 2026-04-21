"use client";

import { useTranslations } from "next-intl";
import type { ApiTestimonial } from "@tge/types";
import { SectionCard } from "@/components/shared/section-card";
import { DefinitionList } from "@/components/shared/definition-list";
import { BilingualView } from "@/components/shared/bilingual-view";

interface TestimonialDetailViewProps {
  testimonial: ApiTestimonial;
}

export function TestimonialDetailView({
  testimonial,
}: TestimonialDetailViewProps) {
  const t = useTranslations("TestimonialForm");

  return (
    <SectionCard title={t("title")}>
      <div className="space-y-4">
        <DefinitionList
          items={[
            { label: t("clientName"), value: testimonial.clientName },
            { label: t("location"), value: testimonial.location || null },
            {
              label: t("propertyType"),
              value: testimonial.propertyType || null,
            },
            {
              label: t("rating"),
              value: t("star", { count: testimonial.rating }),
            },
          ]}
        />
        <BilingualView
          label={t("quote")}
          valueEn={testimonial.quote?.en}
          valueRo={testimonial.quote?.ro}
          valueFr={testimonial.quote?.fr}
          valueDe={testimonial.quote?.de}
          multiline
        />
      </div>
    </SectionCard>
  );
}
