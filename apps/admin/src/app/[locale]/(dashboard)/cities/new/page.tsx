"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { CityForm, type BrandImageFiles } from "@/components/forms/city-form";
import { CityFormValues } from "@/lib/validations/city";

export default function NewCityPage() {
  const router = useRouter();
  const t = useTranslations("Cities");
  const tc = useTranslations("Common");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("city.create")) router.replace("/403");
  }, [can, router]);

  const createMutation = useMutation({
    mutationFn: async ({
      data,
      image,
      brandImages,
    }: {
      data: CityFormValues;
      image: File | null;
      brandImages: BrandImageFiles;
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
      for (const [brand, file] of Object.entries(brandImages)) {
        if (!file) continue;
        const fd = new FormData();
        fd.append("image", file);
        try {
          await apiClient(`/cities/${city.id}/image?brand=${brand}`, {
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
    <CityForm
      cancelHref="/cities"
      onSubmit={(data, image, brandImages) =>
        createMutation.mutate({ data, image, brandImages })
      }
      loading={createMutation.isPending}
      submissionError={createMutation.error}
      title={t("newCity")}
      breadcrumb={
        <Link href="/cities" className="hover:text-foreground hover:underline">
          {tc("back")}
        </Link>
      }
    />
  );
}
