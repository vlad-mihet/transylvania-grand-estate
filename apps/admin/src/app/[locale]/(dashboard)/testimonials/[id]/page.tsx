"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { TestimonialForm } from "@/components/forms/testimonial-form";
import { PageHeader } from "@/components/shared/page-header";
import { TestimonialFormValues } from "@/lib/validations/testimonial";
import type { ApiTestimonial } from "@tge/types";
import { useTranslations } from "next-intl";

export default function EditTestimonialPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Testimonials");

  const { data: testimonial, isLoading } = useQuery({
    queryKey: ["testimonial", id],
    queryFn: () => apiClient<ApiTestimonial>(`/testimonials/${id}`),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: TestimonialFormValues) =>
      apiClient(`/testimonials/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonial", id] });
      toast.success(t("updated"));
      router.push("/testimonials");
    },
  });

  if (isLoading) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  if (!testimonial) return <p>{t("notFound")}</p>;

  return (
    <div className="space-y-6">
      <PageHeader title={t("editTestimonial")} />
      <TestimonialForm
        defaultValues={testimonial}
        onSubmit={(data) => updateMutation.mutate(data)}
        loading={updateMutation.isPending}
        submissionError={updateMutation.error}
      />
    </div>
  );
}
