"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { PropertyForm } from "@/components/forms/property-form";
import { FormPageShell } from "@/components/resource/form-page-shell";
import { PropertyFormValues } from "@/lib/validations/property";
import { toPropertyPayload } from "@/lib/transform-property";
import { GalleryImage } from "@/components/shared/image-gallery-manager";

export default function NewPropertyPage() {
  const router = useRouter();
  const t = useTranslations("Properties");

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      images,
    }: {
      data: PropertyFormValues;
      images: GalleryImage[];
    }) => {
      const property = await apiClient<{ id: string }>("/properties", {
        method: "POST",
        body: toPropertyPayload(data),
      });

      const newImages = images.filter((img) => img.file);
      if (newImages.length > 0) {
        const formData = new FormData();
        newImages.forEach((img) => {
          if (img.file) formData.append("images", img.file);
        });
        try {
          await apiClient(`/properties/${property.id}/images`, {
            method: "POST",
            body: formData,
          });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }

      return property;
    },
    onSuccess: (property) => {
      toast.success(t("created"));
      router.push(`/properties/${property.id}`);
    },
  });

  return (
    <FormPageShell title={t("newProperty")}>
      <PropertyForm
        cancelHref="/properties"
        onSubmit={(data, images) => createMutation.mutate({ data, images })}
        loading={createMutation.isPending}
        submissionError={createMutation.error}
      />
    </FormPageShell>
  );
}
