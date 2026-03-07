"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { CityForm } from "@/components/forms/city-form";
import { PageHeader } from "@/components/shared/page-header";
import { CityFormValues } from "@/lib/validations/city";
import { useTranslations } from "next-intl";

export default function EditCityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Cities");

  const { data: city, isLoading } = useQuery({
    queryKey: ["city", id],
    queryFn: () => apiClient<any>(`/cities/id/${id}`),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ data, image }: { data: CityFormValues; image: File | null }) => {
      await apiClient(`/cities/${id}`, { method: "PATCH", body: data });
      if (image) {
        const fd = new FormData();
        fd.append("image", image);
        await apiClient(`/cities/${id}/image`, { method: "POST", body: fd });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city", id] });
      toast.success(t("updated"));
      router.push("/cities");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  if (!city) return <p>{t("notFound")}</p>;

  return (
    <div className="space-y-6">
      <PageHeader title={t("editCity")} />
      <CityForm
        defaultValues={city}
        imageUrl={city.image}
        onSubmit={(data, image) => updateMutation.mutate({ data, image })}
        loading={updateMutation.isPending}
      />
    </div>
  );
}
