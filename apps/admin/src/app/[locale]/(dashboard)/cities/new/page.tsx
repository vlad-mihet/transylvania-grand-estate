"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { CityForm } from "@/components/forms/city-form";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { CityFormValues } from "@/lib/validations/city";

export default function NewCityPage() {
  const router = useRouter();
  const t = useTranslations("Cities");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("city.create")) router.replace("/403");
  }, [can, router]);

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      image,
    }: {
      data: CityFormValues;
      image: File | null;
    }) => {
      const city = await apiClient<{ id: string }>("/cities", {
        method: "POST",
        body: data,
      });
      if (image) {
        const fd = new FormData();
        fd.append("image", image);
        try {
          await apiClient(`/cities/${city.id}/image`, {
            method: "POST",
            body: fd,
          });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
      return city;
    },
    onSuccess: (city) => {
      toast.success(t("created"));
      router.push(`/cities/${city.id}`);
    },
  });

  if (!can("city.create")) return null;

  return (
    <FormPageShell title={t("newCity")}>
      <CityForm
        cancelHref="/cities"
        onSubmit={(data, image) => createMutation.mutate({ data, image })}
        loading={createMutation.isPending}
        submissionError={createMutation.error}
      />
    </FormPageShell>
  );
}
