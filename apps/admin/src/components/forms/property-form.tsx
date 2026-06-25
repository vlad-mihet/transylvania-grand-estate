"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@tge/ui";
import {
  EntryEditorShell,
  EntryLocaleProvider,
  LocalizedInput,
  LocalizedTextarea,
  MetaField,
  MetaSection,
  useLocaleCompleteness,
} from "@/components/entry-editor";
import { FormActions } from "@/components/shared/form-actions";
import {
  ImageGalleryManager,
  GalleryImage,
} from "@/components/shared/image-gallery-manager";
import { useApiFormErrors } from "@tge/hooks";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import {
  propertySchema,
  PropertyFormValues,
} from "@/lib/validations/property";
import type { ApiAgent, ApiCity, ApiDeveloper } from "@tge/types";

// react-hook-form's <input type="number"> still emits string values; without
// a converter, the form state holds "275000" while the Zod schema expects
// `z.number()`. Submit then fails silently and `shouldFocusError` bounces
// focus back to the field on every click. These helpers map the empty
// string to `null`/`undefined` (so optional/nullable schemas accept it) and
// otherwise coerce to Number. Required fields get the simpler `valueAsNumber`
// builtin which produces NaN on empty — fine, since required fields can't be
// empty at submit time.
const requiredNumber = { valueAsNumber: true } as const;
const optionalNullableNumber = {
  setValueAs: (v: unknown) =>
    v === "" || v === null || v === undefined ? null : Number(v),
} as const;
const optionalNumber = {
  setValueAs: (v: unknown) =>
    v === "" || v === null || v === undefined ? undefined : Number(v),
} as const;

const PROPERTY_TYPE_VALUES = [
  "apartment",
  "house",
  "villa",
  "terrain",
  "penthouse",
  "estate",
  "chalet",
  "mansion",
  "palace",
] as const;

const PROPERTY_STATUS_VALUES = ["available", "reserved", "sold"] as const;

interface PropertyFormProps {
  defaultValues?: Partial<PropertyFormValues>;
  images?: GalleryImage[];
  onSubmit: (data: PropertyFormValues, images: GalleryImage[]) => void;
  loading?: boolean;
  submissionError?: unknown;
  /** Where Cancel navigates (detail page on edit, list on create). */
  cancelHref: string;
  title: ReactNode;
  breadcrumb?: ReactNode;
}

export function PropertyForm({
  defaultValues,
  images: initialImages = [],
  onSubmit,
  loading,
  submissionError,
  cancelHref,
  title,
  breadcrumb,
}: PropertyFormProps) {
  const [galleryImages, setGalleryImages] =
    useState<GalleryImage[]>(initialImages);
  const tc = useTranslations("Common");

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: { en: "", ro: "", fr: "", de: "" },
      description: { en: "", ro: "", fr: "", de: "" },
      shortDescription: { en: "", ro: "", fr: "", de: "" },
      slug: "",
      price: 0,
      currency: "EUR",
      type: "apartment",
      status: "available",
      // Brand/tier the listing belongs to. luxury → TGE, affordable → REVERY.
      // Without this the API defaults to luxury and the listing only ever
      // shows on TGE — the form must let the agent choose.
      tier: "luxury",
      city: "",
      citySlug: "",
      neighborhood: "",
      address: { en: "", ro: "", fr: "", de: "" },
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

  useApiFormErrors(form, submissionError, (err) => {
    toast.error(err instanceof Error ? err.message : tc("saveFailed"));
  });

  // Guard against accidental tab close / browser-nav loss once the form has
  // unsaved edits. Doesn't cover client-side route changes (Next's App
  // Router doesn't expose a cancellable interception API yet), but it
  // catches the common footgun.
  useUnsavedChangesWarning(form.formState.isDirty);

  const handleFormSubmit = form.handleSubmit((data) => {
    onSubmit(data, galleryImages);
  });

  return (
    <FormProvider {...form}>
      <EntryLocaleProvider>
        <form onSubmit={handleFormSubmit}>
          <PropertyFormBody
            cancelHref={cancelHref}
            loading={loading}
            dirty={form.formState.isDirty}
            galleryImages={galleryImages}
            onGalleryChange={setGalleryImages}
            title={title}
            breadcrumb={breadcrumb}
          />
        </form>
      </EntryLocaleProvider>
    </FormProvider>
  );
}

interface BodyProps {
  cancelHref: string;
  loading?: boolean;
  dirty: boolean;
  galleryImages: GalleryImage[];
  onGalleryChange: (next: GalleryImage[]) => void;
  title: ReactNode;
  breadcrumb?: ReactNode;
}

function PropertyFormBody({
  cancelHref,
  loading,
  dirty,
  galleryImages,
  onGalleryChange,
  title,
  breadcrumb,
}: BodyProps) {
  const t = useTranslations("PropertyForm");
  const form = useFormContext<PropertyFormValues>();
  const { completeness, errorCounts } = useLocaleCompleteness<PropertyFormValues>(
    ["title", "description", "shortDescription", "address"],
  );

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

  return (
    <EntryEditorShell
      title={title}
      breadcrumb={breadcrumb}
      unsavedDirty={dirty}
      switcherCompleteness={completeness}
      switcherErrorCounts={errorCounts}
      actions={
        <FormActions cancelHref={cancelHref} loading={loading} dirty={dirty} />
      }
      localizedFields={
        <>
          <LocalizedInput<PropertyFormValues>
            name="title"
            label={t("title")}
            required
          />
          <LocalizedTextarea<PropertyFormValues>
            name="shortDescription"
            label={t("shortDescription")}
            required
            rows={2}
          />
          <LocalizedTextarea<PropertyFormValues>
            name="description"
            label={t("description")}
            required
            rows={5}
          />
          <LocalizedInput<PropertyFormValues>
            name="address"
            label={t("address")}
            required
          />
        </>
      }
      extraSection={
        <PropertyGallerySection
          label={t("images")}
          images={galleryImages}
          onChange={onGalleryChange}
        />
      }
      metadataFields={<PropertyMetadataFields isTerrain={isTerrain} t={t} />}
    />
  );
}

function PropertyGallerySection({
  label,
  images,
  onChange,
}: {
  label: string;
  images: GalleryImage[];
  onChange: (next: GalleryImage[]) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
        {label}
      </p>
      <ImageGalleryManager images={images} onChange={onChange} />
    </div>
  );
}

function PropertyMetadataFields({
  isTerrain,
  t,
}: {
  isTerrain: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const tc = useTranslations("Common");
  const form = useFormContext<PropertyFormValues>();

  const { data: developers } = useQuery({
    queryKey: ["developers-select"],
    queryFn: () => apiClient<ApiDeveloper[]>("/developers"),
  });
  const { data: agents } = useQuery({
    queryKey: ["agents-select"],
    queryFn: () => apiClient<ApiAgent[]>("/agents?active=true"),
  });
  const { data: cities } = useQuery({
    queryKey: ["cities-select"],
    queryFn: () => apiClient<ApiCity[]>("/cities"),
  });

  const handleCityChange = (slug: string) => {
    const city = (cities ?? []).find((c) => c.slug === slug);
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

  return (
    <div className="flex flex-col gap-5">
      <MetaSection title={t("basicInfo")}>
        <MetaField id="property-slug" label={t("slug")}>
          <div className="flex gap-2">
            <Input
              id="property-slug"
              {...form.register("slug")}
              className="mono flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateSlug}
            >
              {tc("generate")}
            </Button>
          </div>
        </MetaField>
        <MetaField id="property-type" label={t("type")}>
          <Select
            value={form.watch("type")}
            onValueChange={(v) =>
              form.setValue("type", v as PropertyFormValues["type"])
            }
          >
            <SelectTrigger id="property-type">
              <SelectValue placeholder={t("selectType")} />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPE_VALUES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MetaField>
        <MetaField id="property-status" label={t("status")}>
          <Select
            value={form.watch("status")}
            onValueChange={(v) =>
              form.setValue("status", v as PropertyFormValues["status"])
            }
          >
            <SelectTrigger id="property-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_STATUS_VALUES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`statuses.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MetaField>
        {/* Brand/tier selector. Labels are literal (brand names are proper
            nouns); i18n keys are a follow-up polish. Drives which site the
            listing publishes to — luxury → TGE, affordable → REVERY. */}
        <MetaField id="property-tier" label="Brand / Tier">
          <Select
            value={form.watch("tier") ?? "luxury"}
            onValueChange={(v) =>
              form.setValue("tier", v as PropertyFormValues["tier"])
            }
          >
            <SelectTrigger id="property-tier">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="luxury">Luxury — TGE</SelectItem>
              <SelectItem value="affordable">Affordable — REVERY</SelectItem>
            </SelectContent>
          </Select>
        </MetaField>
      </MetaSection>

      <MetaSection title={t("details")}>
        <MetaField id="property-price" label={t("price")}>
          <Input
            id="property-price"
            type="number"
            {...form.register("price", requiredNumber)}
            className="mono"
          />
        </MetaField>
        <MetaField id="property-currency" label={t("currency")}>
          <Select
            value={form.watch("currency")}
            onValueChange={(v) => form.setValue("currency", v)}
          >
            <SelectTrigger id="property-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="RON">RON</SelectItem>
            </SelectContent>
          </Select>
        </MetaField>
        <SwitchRow
          label={t("featured")}
          checked={form.watch("featured")}
          onCheckedChange={(v) => form.setValue("featured", v)}
        />
        <SwitchRow
          label={t("newListing")}
          checked={form.watch("isNew")}
          onCheckedChange={(v) => form.setValue("isNew", v)}
        />
      </MetaSection>

      <MetaSection title={tc("relations") ?? "Relations"}>
        <MetaField id="property-developer" label={t("developer")}>
          <Select
            value={form.watch("developerId") ?? "__none__"}
            onValueChange={(v) =>
              form.setValue("developerId", v === "__none__" ? null : v)
            }
          >
            <SelectTrigger id="property-developer">
              <SelectValue placeholder={t("noDeveloper")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("none")}</SelectItem>
              {(developers ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MetaField>
        <MetaField id="property-agent" label={t("agent")}>
          <Select
            value={form.watch("agentId") ?? "__none__"}
            onValueChange={(v) =>
              form.setValue("agentId", v === "__none__" ? null : v)
            }
          >
            <SelectTrigger id="property-agent">
              <SelectValue placeholder={t("noAgent")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("none")}</SelectItem>
              {(agents ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MetaField>
      </MetaSection>

      <MetaSection title={t("location")}>
        <MetaField id="property-city" label={t("city")}>
          <Select value={form.watch("citySlug")} onValueChange={handleCityChange}>
            <SelectTrigger id="property-city">
              <SelectValue placeholder={t("selectCity")} />
            </SelectTrigger>
            <SelectContent>
              {(cities ?? []).map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </MetaField>
        <MetaField id="property-neighborhood" label={t("neighborhood")}>
          <Input id="property-neighborhood" {...form.register("neighborhood")} />
        </MetaField>
        <MetaField id="property-latitude" label={t("latitude")}>
          <Input
            id="property-latitude"
            type="number"
            step="any"
            {...form.register("latitude", optionalNumber)}
            className="mono"
          />
        </MetaField>
        <MetaField id="property-longitude" label={t("longitude")}>
          <Input
            id="property-longitude"
            type="number"
            step="any"
            {...form.register("longitude", optionalNumber)}
            className="mono"
          />
        </MetaField>
      </MetaSection>

      <MetaSection title={t("specifications")}>
        {!isTerrain ? (
          <>
            <MetaField id="property-bedrooms" label={t("bedrooms")}>
              <Input
                id="property-bedrooms"
                type="number"
                {...form.register("bedrooms", requiredNumber)}
                className="mono"
              />
            </MetaField>
            <MetaField id="property-bathrooms" label={t("bathrooms")}>
              <Input
                id="property-bathrooms"
                type="number"
                {...form.register("bathrooms", requiredNumber)}
                className="mono"
              />
            </MetaField>
            <MetaField id="property-floors" label={t("floors")}>
              <Input
                id="property-floors"
                type="number"
                {...form.register("floors", requiredNumber)}
                className="mono"
              />
            </MetaField>
            <MetaField id="property-year-built" label={t("yearBuilt")}>
              <Input
                id="property-year-built"
                type="number"
                {...form.register("yearBuilt", requiredNumber)}
                className="mono"
              />
            </MetaField>
            <MetaField id="property-garage" label={t("garageSpots")}>
              <Input
                id="property-garage"
                type="number"
                {...form.register("garage", optionalNullableNumber)}
                className="mono"
              />
            </MetaField>
          </>
        ) : null}
        <MetaField id="property-area" label={t("area")}>
          <Input
            id="property-area"
            type="number"
            {...form.register("area", requiredNumber)}
            className="mono"
          />
        </MetaField>
        <MetaField id="property-land-area" label={t("landArea")}>
          <Input
            id="property-land-area"
            type="number"
            {...form.register("landArea", optionalNullableNumber)}
            className="mono"
          />
        </MetaField>
        <SwitchRow
          label={t("pool")}
          checked={form.watch("pool")}
          onCheckedChange={(v) => form.setValue("pool", v)}
        />
      </MetaSection>
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean | undefined;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs">
      <span className="font-medium tracking-[0.04em]">{label}</span>
      <Switch checked={!!checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
