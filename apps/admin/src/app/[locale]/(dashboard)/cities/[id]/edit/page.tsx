"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ApiCity } from "@tge/types";

import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { CityForm, type BrandImageFiles } from "@/components/forms/city-form";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import { CityFormValues } from "@/lib/validations/city";

export default function EditCityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Cities");
  const tc = useTranslations("Common");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("city.update")) router.replace("/403");
  }, [can, router]);

  const updateMutation = useMutation({
    mutationFn: async ({
      data,
      image,
      brandImages,
    }: {
      data: CityFormValues;
      image: File | null;
      brandImages: BrandImageFiles;
    }) => {
      // PATCH first so a brand added in this same save is tagged before its
      // per-brand upload hits the membership check.
      await apiClient(`/cities/${id}`, { method: "PATCH", body: data });
      if (image) {
        const fd = new FormData();
        fd.append("image", image);
        try {
          await apiClient(`/cities/${id}/image`, {
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
          await apiClient(`/cities/${id}/image?brand=${brand}`, {
            method: "POST",
            body: fd,
          });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city", id] });
      queryClient.invalidateQueries({ queryKey: ["cities"] });
      toast.success(t("updated"));
      router.push(`/cities/${id}`);
    },
  });

  if (!can("city.update")) return null;

  return (
    <DetailPageShell<ApiCity>
      queryKey={["city", id]}
      queryFn={() => apiClient<ApiCity>(`/cities/id/${id}`)}
      enabled={!!id}
      notFoundTitle={t("notFound")}
      render={(city) => (
        <div>
          <div className="flex items-center justify-end gap-2 px-4 pt-3 md:px-6">
            <EntityDeleteButton
              apiPath={`/cities/${id}`}
              permission="city.delete"
              listHref="/cities"
              invalidateKeys={[["cities"], ["city", id]]}
              confirmTitle={t("deleteTitle")}
              successMessage={t("deleted")}
              errorMessage={t("deleteFailed")}
            />
          </div>
          <CityForm
            cancelHref={`/cities/${id}`}
            // Only form fields — the schema is .strict(), so spreading the
            // whole ApiCity (id, county, createdAt, brandImages, …) makes
            // zodResolver reject the submit with invisible root-level errors.
            defaultValues={{
              name: city.name,
              slug: city.slug,
              countySlug: city.countySlug ?? city.county?.slug ?? undefined,
              description: city.description,
              image: city.image ?? undefined,
              propertyCount: city.propertyCount,
              brands: city.brands ?? [],
            }}
            imageUrl={city.image}
            brandImageUrls={city.brandImages}
            onSubmit={(data, image, brandImages) =>
              updateMutation.mutate({ data, image, brandImages })
            }
            loading={updateMutation.isPending}
            submissionError={updateMutation.error}
            title={city.name}
            breadcrumb={
              <Link
                href={`/cities/${id}`}
                className="hover:text-foreground hover:underline"
              >
                {tc("back")}
              </Link>
            }
          />
        </div>
      )}
    />
  );
}
