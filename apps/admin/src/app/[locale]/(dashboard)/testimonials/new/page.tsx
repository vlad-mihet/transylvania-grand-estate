"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { TestimonialForm } from "@/components/forms/testimonial-form";
import { PageHeader } from "@/components/shared/page-header";
import { TestimonialFormValues } from "@/lib/validations/testimonial";
import { useTranslations } from "next-intl";

export default function NewTestimonialPage() {
  const router = useRouter();
  const t = useTranslations("Testimonials");

  const createMutation = useMutation({
    mutationFn: (data: TestimonialFormValues) =>
      apiClient("/testimonials", { method: "POST", body: data }),
    onSuccess: () => { toast.success(t("created")); router.push("/testimonials"); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("newTestimonial")} />
      <TestimonialForm
        onSubmit={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
      />
    </div>
  );
}
