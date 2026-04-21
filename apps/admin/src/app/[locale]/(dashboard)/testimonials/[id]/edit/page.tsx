"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ApiTestimonial } from "@tge/types";

import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { TestimonialForm } from "@/components/forms/testimonial-form";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { TestimonialFormValues } from "@/lib/validations/testimonial";

export default function EditTestimonialPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Testimonials");

  const updateMutation = useMutation({
    mutationFn: (data: TestimonialFormValues) =>
      apiClient(`/testimonials/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonial", id] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast.success(t("updated"));
      router.push(`/testimonials/${id}`);
    },
  });

  return (
    <DetailPageShell<ApiTestimonial>
      queryKey={["testimonial", id]}
      queryFn={() => apiClient<ApiTestimonial>(`/testimonials/${id}`)}
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(testimonial) => (
        <FormPageShell
          title={t("editTestimonial")}
          actions={
            <EntityDeleteButton
              apiPath={`/testimonials/${id}`}
              permission="testimonial.delete"
              listHref="/testimonials"
              invalidateKeys={[["testimonials"], ["testimonial", id]]}
              confirmTitle={t("deleteTitle")}
              successMessage={t("deleted")}
              errorMessage={t("deleteFailed")}
            />
          }
        >
          <TestimonialForm
            cancelHref={`/testimonials/${id}`}
            defaultValues={testimonial}
            onSubmit={(data) => updateMutation.mutate(data)}
            loading={updateMutation.isPending}
            submissionError={updateMutation.error}
          />
        </FormPageShell>
      )}
    />
  );
}
