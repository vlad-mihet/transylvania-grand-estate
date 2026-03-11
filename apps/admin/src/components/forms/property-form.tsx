"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  propertySchema,
  PropertyFormValues,
} from "@/lib/validations/property";
import { BilingualInput } from "@/components/shared/bilingual-input";
import { BilingualTextarea } from "@/components/shared/bilingual-textarea";
import {
  ImageGalleryManager,
  GalleryImage,
} from "@/components/shared/image-gallery-manager";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@tge/ui";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useTranslations } from "next-intl";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "villa", label: "Villa" },
  { value: "terrain", label: "Terrain" },
  { value: "penthouse", label: "Penthouse" },
  { value: "estate", label: "Estate" },
  { value: "chalet", label: "Chalet" },
  { value: "mansion", label: "Mansion" },
  { value: "palace", label: "Palace" },
] as const;

const PROPERTY_STATUSES = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
] as const;

interface PropertyFormProps {
  defaultValues?: Partial<PropertyFormValues>;
  images?: GalleryImage[];
  onSubmit: (data: PropertyFormValues, images: GalleryImage[]) => void;
  loading?: boolean;
}

export function PropertyForm({
  defaultValues,
  images: initialImages = [],
  onSubmit,
  loading,
}: PropertyFormProps) {
  const [galleryImages, setGalleryImages] =
    useState<GalleryImage[]>(initialImages);
  const t = useTranslations("PropertyForm");
  const tc = useTranslations("Common");

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: { en: "", ro: "" },
      description: { en: "", ro: "" },
      shortDescription: { en: "", ro: "" },
      slug: "",
      price: 0,
      currency: "EUR",
      type: "apartment",
      status: "available",
      city: "",
      citySlug: "",
      neighborhood: "",
      address: { en: "", ro: "" },
      bedrooms: 0,
      bathrooms: 0,
      area: 0,
      floors: 1,
      pool: false,
      features: [],
      featured: false,
      isNew: false,
      ...defaultValues,
    },
  });

  const watchedType = form.watch("type");
  const isTerrain = watchedType === "terrain";

  useEffect(() => {
    if (isTerrain) {
      form.setValue("bedrooms", 0);
      form.setValue("bathrooms", 0);
      form.setValue("floors", 0);
      form.setValue("yearBuilt", 0);
      form.setValue("garage", null);
    }
  }, [isTerrain, form]);

  const { data: developers } = useQuery({
    queryKey: ["developers-select"],
    queryFn: () => apiClient<any[]>("/developers"),
  });

  const { data: cities } = useQuery({
    queryKey: ["cities-select"],
    queryFn: () => apiClient<any[]>("/cities"),
  });

  const handleCityChange = (slug: string) => {
    const city = (cities ?? []).find((c: any) => c.slug === slug);
    if (city) {
      form.setValue("city", city.name);
      form.setValue("citySlug", city.slug);
    }
  };

  const generateSlug = () => {
    const title = form.getValues("title.en");
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    form.setValue("slug", slug);
  };

  const handleFormSubmit = form.handleSubmit((data) => {
    onSubmit(data, galleryImages);
  });

  return (
    <form onSubmit={handleFormSubmit} className="max-w-5xl space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{t("basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BilingualInput
            label={t("title")}
            valueEn={form.watch("title.en")}
            valueRo={form.watch("title.ro")}
            onChangeEn={(v) => form.setValue("title.en", v)}
            onChangeRo={(v) => form.setValue("title.ro", v)}
            required
          />
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label>{t("slug")}</Label>
              <Input {...form.register("slug")} />
            </div>
            <Button type="button" variant="outline" onClick={generateSlug}>
              {tc("generate")}
            </Button>
          </div>
          <BilingualTextarea
            label={t("description")}
            valueEn={form.watch("description.en")}
            valueRo={form.watch("description.ro")}
            onChangeEn={(v) => form.setValue("description.en", v)}
            onChangeRo={(v) => form.setValue("description.ro", v)}
            required
            rows={5}
          />
          <BilingualTextarea
            label={t("shortDescription")}
            valueEn={form.watch("shortDescription.en")}
            valueRo={form.watch("shortDescription.ro")}
            onChangeEn={(v) => form.setValue("shortDescription.en", v)}
            onChangeRo={(v) => form.setValue("shortDescription.ro", v)}
            required
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Type, Status, Price */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{t("details")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("type")}</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(v) => form.setValue("type", v as PropertyFormValues["type"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectType")} />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("status")}</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as PropertyFormValues["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("developer")}</Label>
              <Select
                value={form.watch("developerId") ?? "__none__"}
                onValueChange={(v) =>
                  form.setValue("developerId", v === "__none__" ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("noDeveloper")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("none")}</SelectItem>
                  {(developers ?? []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("price")}</Label>
              <Input type="number" {...form.register("price")} />
            </div>
            <div className="space-y-2">
              <Label>{t("currency")}</Label>
              <Select
                value={form.watch("currency")}
                onValueChange={(v) => form.setValue("currency", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="RON">RON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.watch("featured")}
                onCheckedChange={(v) => form.setValue("featured", v)}
              />
              {t("featured")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.watch("isNew")}
                onCheckedChange={(v) => form.setValue("isNew", v)}
              />
              {t("newListing")}
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{t("location")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("city")}</Label>
              <Select
                value={form.watch("citySlug")}
                onValueChange={handleCityChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectCity")} />
                </SelectTrigger>
                <SelectContent>
                  {(cities ?? []).map((c: any) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("neighborhood")}</Label>
              <Input {...form.register("neighborhood")} />
            </div>
          </div>
          <BilingualInput
            label={t("address")}
            valueEn={form.watch("address.en")}
            valueRo={form.watch("address.ro")}
            onChangeEn={(v) => form.setValue("address.en", v)}
            onChangeRo={(v) => form.setValue("address.ro", v)}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("latitude")}</Label>
              <Input type="number" step="any" {...form.register("latitude")} />
            </div>
            <div className="space-y-2">
              <Label>{t("longitude")}</Label>
              <Input type="number" step="any" {...form.register("longitude")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specs */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{t("specifications")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {!isTerrain && (
              <div className="space-y-2">
                <Label>{t("bedrooms")}</Label>
                <Input type="number" {...form.register("bedrooms")} />
              </div>
            )}
            {!isTerrain && (
              <div className="space-y-2">
                <Label>{t("bathrooms")}</Label>
                <Input type="number" {...form.register("bathrooms")} />
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("area")}</Label>
              <Input type="number" {...form.register("area")} />
            </div>
            <div className="space-y-2">
              <Label>{t("landArea")}</Label>
              <Input type="number" {...form.register("landArea")} />
            </div>
            {!isTerrain && (
              <div className="space-y-2">
                <Label>{t("floors")}</Label>
                <Input type="number" {...form.register("floors")} />
              </div>
            )}
            {!isTerrain && (
              <div className="space-y-2">
                <Label>{t("yearBuilt")}</Label>
                <Input type="number" {...form.register("yearBuilt")} />
              </div>
            )}
            {!isTerrain && (
              <div className="space-y-2">
                <Label>{t("garageSpots")}</Label>
                <Input type="number" {...form.register("garage")} />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm pt-7">
              <Switch
                checked={form.watch("pool")}
                onCheckedChange={(v) => form.setValue("pool", v)}
              />
              {t("pool")}
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{t("images")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageGalleryManager
            images={galleryImages}
            onChange={setGalleryImages}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {tc("saving")}</> : t("saveProperty")}
        </Button>
      </div>
    </form>
  );
}
