"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import type { ApiTestimonial } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@tge/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DetailView } from "@/components/shared/detail-view";
import { Can } from "@/components/shared/can";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { TestimonialDetailView } from "@/components/testimonials/testimonial-detail-view";

export default function TestimonialViewPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("Testimonials");
  const tc = useTranslations("Common");

  return (
    <DetailPageShell<ApiTestimonial>
      queryKey={["testimonial", id]}
      queryFn={() => apiClient<ApiTestimonial>(`/testimonials/${id}`)}
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(testimonial) => (
        <DetailView>
          <PageHeader
            title={testimonial.clientName}
            actions={
              <>
                <EntityDeleteButton
                  apiPath={`/testimonials/${testimonial.id}`}
                  permission="testimonial.delete"
                  listHref="/testimonials"
                  invalidateKeys={[
                    ["testimonials"],
                    ["testimonial", testimonial.id],
                  ]}
                  confirmTitle={t("deleteTitle")}
                  successMessage={t("deleted")}
                  errorMessage={t("deleteFailed")}
                />
                <Can action="testimonial.update">
                  <Button asChild size="sm">
                    <Link href={`/testimonials/${testimonial.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">{tc("edit")}</span>
                    </Link>
                  </Button>
                </Can>
              </>
            }
          />
          <TestimonialDetailView testimonial={testimonial} />
        </DetailView>
      )}
    />
  );
}
