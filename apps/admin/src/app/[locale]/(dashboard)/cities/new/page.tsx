"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { CityForm } from "@/components/forms/city-form";
import { PageHeader } from "@/components/shared/page-header";
import { CityFormValues } from "@/lib/validations/city";
import { useTranslations } from "next-intl";

export default function NewCityPage() {
  const router = useRouter();
  const t = useTranslations("Cities");

  const createMutation = useMutation({
    mutationFn: async ({ data, image }: { data: CityFormValues; image: File | null }) => {
      const city = await apiClient<{ id: string }>("/cities", { method: "POST", body: data });
      if (image) {
        const fd = new FormData();
        fd.append("image", image);
        try {
          await apiClient(`/cities/${city.id}/image`, { method: "POST", body: fd });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
      return city;
    },
    onSuccess: () => { toast.success(t("created")); router.push("/cities"); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("newCity")} />
      <CityForm
        onSubmit={(data, image) => createMutation.mutate({ data, image })}
        loading={createMutation.isPending}
      />
    </div>
  );
}
