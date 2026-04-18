"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { PropertyForm } from "@/components/forms/property-form";
import { PageHeader } from "@/components/shared/page-header";
import { PropertyFormValues } from "@/lib/validations/property";
import { toPropertyPayload } from "@/lib/transform-property";
import { GalleryImage } from "@/components/shared/image-gallery-manager";
import type { ApiProperty, ApiPropertyImage } from "@tge/types";
import { useTranslations } from "next-intl";

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Properties");

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: () => apiClient<ApiProperty>(`/properties/id/${id}`),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      data,
      images,
    }: {
      data: PropertyFormValues;
      images: GalleryImage[];
    }) => {
      await apiClient(`/properties/${id}`, {
        method: "PATCH",
        body: toPropertyPayload(data),
      });

      // Upload new images
      const newImages = images.filter((img) => img.file);
      if (newImages.length > 0) {
        const formData = new FormData();
        newImages.forEach((img) => {
          if (img.file) formData.append("images", img.file);
        });
        try {
          await apiClient(`/properties/${id}/images`, {
            method: "POST",
            body: formData,
          });
        } catch {
          toast.warning(t("imageUploadFailed"));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      toast.success(t("updated"));
      router.push("/properties");
    },
  });

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  }

  if (!property) {
    return <p>{t("notFound")}</p>;
  }

  // Map API data to form values. ApiProperty fields are `T | null`;
  // PropertyFormValues uses `T | undefined` — bridge with `?? undefined`.
  const defaultValues: Partial<PropertyFormValues> = {
    title: property.title,
    description: property.description,
    shortDescription: property.shortDescription,
    slug: property.slug,
    price: property.price,
    currency: property.currency,
    type: property.type,
    status: property.status,
    city: property.city,
    citySlug: property.citySlug,
    neighborhood: property.neighborhood ?? "",
    address: property.address ?? { en: "", ro: "" },
    latitude: property.latitude ?? undefined,
    longitude: property.longitude ?? undefined,
    bedrooms: property.bedrooms ?? undefined,
    bathrooms: property.bathrooms ?? undefined,
    area: property.area ?? undefined,
    landArea: property.landArea ?? undefined,
    floors: property.floors ?? undefined,
    yearBuilt: property.yearBuilt ?? undefined,
    garage: property.garage ?? undefined,
    pool: property.pool ?? undefined,
    features: property.features ?? [],
    featured: property.featured,
    isNew: property.isNew,
    developerId: property.developerId,
  };

  const existingImages: GalleryImage[] = (property.images ?? []).map(
    (img: ApiPropertyImage) => ({
      id: img.id,
      src: img.src,
      alt: typeof img.alt === "string" ? img.alt : (img.alt as Record<string, string> | null)?.en ?? "",
      isHero: img.isHero ?? false,
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("editProperty")} />
      <PropertyForm
        defaultValues={defaultValues}
        images={existingImages}
        onSubmit={(data, images) => updateMutation.mutate({ data, images })}
        loading={updateMutation.isPending}
        submissionError={updateMutation.error}
      />
    </div>
  );
}
