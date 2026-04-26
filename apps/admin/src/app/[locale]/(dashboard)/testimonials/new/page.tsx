"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { TestimonialForm } from "@/components/forms/testimonial-form";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { TestimonialFormValues } from "@/lib/validations/testimonial";

export default function NewTestimonialPage() {
  const router = useRouter();
  const t = useTranslations("Testimonials");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("testimonial.create")) router.replace("/403");
  }, [can, router]);

  const createMutation = useMutation({
    mutationFn: (data: TestimonialFormValues) =>
      apiClient<{ id: string }>("/testimonials", {
        method: "POST",
        body: data,
      }),
    onSuccess: (testimonial) => {
      toast.success(t("created"));
      router.push(`/testimonials/${testimonial.id}`);
    },
  });

  if (!can("testimonial.create")) return null;

  return (
    <FormPageShell title={t("newTestimonial")}>
      <TestimonialForm
        cancelHref="/testimonials"
        onSubmit={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
        submissionError={createMutation.error}
      />
    </FormPageShell>
  );
}
