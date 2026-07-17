"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useFormState,
} from "react-hook-form";
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
import { AddressGeocodeField } from "@/components/forms/address-geocode-field";
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
// Like requiredNumber but maps an empty field to 0 instead of NaN. Used for
// yearBuilt so clearing it surfaces the schema's friendly "must be at least
// 1800" message (via superRefine) rather than the raw Zod "expected number,
// received NaN" (BUG-116). Terrain listings legitimately accept 0.
const requiredNumberOrZero = {
  setValueAs: (v: unknown) =>
    v === "" || v === null || v === undefined ? 0 : Number(v),
} as const;
const optionalNullableNumber = {
  setValueAs: (v: unknown) =>
    v === "" || v === null || v === undefined ? null : Number(v),
} as const;
const optionalNumber = {
  setValueAs: (v: unknown) =>
    v === "" || v === null || v === undefined ? undefined : Number(v),
} as const;

// Diacritic-aware slugifier. NFKD decomposition + stripping combining marks
// turns ă/â/î/ș/ț into a/a/i/s/t (rather than deleting them, which produced
// "bucureti" from "București"); the cedilla variants ş/ţ are mapped explicitly
// as a belt-and-braces fallback.
function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritical marks
    .replace(/[şŞ]/g, "s")
    .replace(/[ţŢ]/g, "t")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

// The 18 amenity flags (mirror the Prisma boolean columns / amenityFlagsSchema).
// Labels come from i18n (`PropertyForm.amenities.<name>`).
const AMENITY_FIELDS = [
  "hasBalcony",
  "hasTerrace",
  "hasParking",
  "hasGarage",
  "hasSeparateKitchen",
  "hasStorage",
  "hasElevator",
  "hasInteriorStaircase",
  "hasWashingMachine",
  "hasFridge",
  "hasStove",
  "hasOven",
  "hasAC",
  "hasBlinds",
  "hasArmoredDoors",
  "hasIntercom",
  "hasInternet",
  "hasCableTV",
] as const;

// Optional classification enums (values mirror the Prisma enums). Each renders
// as a Select with a "—" (none) option since they're optional. Group labels
// come from `PropertyForm.classification.<name>`; option labels from
// `PropertyForm.classificationValues.<value>`.
const CLASSIFICATION_FIELDS = [
  ["furnishing", ["unfurnished", "semi_furnished", "furnished", "luxury"]],
  ["material", ["brick", "concrete", "bca", "wood", "stone", "mixed"]],
  ["condition", ["new_build", "renovated", "good", "needs_renovation", "under_construction"]],
  ["sellerType", ["private_seller", "agency", "developer"]],
  ["heating", ["central_gas", "centralized", "block_central", "electric", "heat_pump", "solid_fuel", "none"]],
  ["ownership", ["personal", "company", "mixed"]],
  ["windowType", ["pvc_double", "pvc_triple", "wood", "aluminum", "mixed"]],
] as const;

const NONE = "__none__";

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
      // 18 amenity flags default off so their Switches render controlled.
      hasBalcony: false, hasTerrace: false, hasParking: false, hasGarage: false,
      hasSeparateKitchen: false, hasStorage: false, hasElevator: false,
      hasInteriorStaircase: false, hasWashingMachine: false, hasFridge: false,
      hasStove: false, hasOven: false, hasAC: false, hasBlinds: false,
      hasArmoredDoors: false, hasIntercom: false, hasInternet: false,
      hasCableTV: false,
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

  const handleFormSubmit = form.handleSubmit(
    (data) => {
      onSubmit(data, galleryImages);
    },
    // Without an invalid handler a blocked submit is completely silent — and
    // several required fields (slug, city, neighborhood, yearBuilt) live in
    // sections far from the localized tabs, so the user sees nothing happen.
    // Surface a toast; the per-field errors + locale-switcher badges point to
    // where. RHF's shouldFocusError also scrolls to the first offender.
    (errors) => {
      const count = Object.keys(errors).length;
      toast.error(
        count > 0
          ? `Please fix ${count} field${count === 1 ? "" : "s"} before saving — check the highlighted fields.`
          : "Please review the highlighted fields before saving.",
      );
    },
  );

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
  // Subscribe to validation errors so non-localized (MetaField) inputs can
  // render their message. Previously these errors existed in RHF state but
  // were never displayed, so a save blocked on e.g. an empty `neighborhood`
  // or `yearBuilt` failed silently.
  const { errors } = useFormState({ control: form.control });
  const fe = (name: keyof PropertyFormValues): string | undefined =>
    (errors as Record<string, { message?: string } | undefined>)[name as string]
      ?.message;
  const {
    fields: featureFields,
    append: appendFeature,
    remove: removeFeature,
  } = useFieldArray({ control: form.control, name: "features" });

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
    // Derive from whichever localized title is filled — RO-first editors were
    // getting an empty slug because this only ever read `title.en` (BUG-115).
    const titles = form.getValues("title");
    const source =
      titles?.en?.trim() ||
      titles?.ro?.trim() ||
      titles?.fr?.trim() ||
      titles?.de?.trim() ||
      "";
    form.setValue("slug", slugify(source), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <MetaSection title={t("basicInfo")}>
        <MetaField id="property-slug" label={t("slug")} error={fe("slug")}>
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
        <MetaField id="property-price" label={t("price")} error={fe("price")}>
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
        <MetaField
          id="property-city"
          label={t("city")}
          error={fe("citySlug") ?? fe("city")}
        >
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
        <MetaField
          id="property-neighborhood"
          label={t("neighborhood")}
          error={fe("neighborhood")}
        >
          <Input id="property-neighborhood" {...form.register("neighborhood")} />
        </MetaField>
        <MetaField id="property-geocode" label="Find address">
          <AddressGeocodeField />
        </MetaField>
        <MetaField id="property-latitude" label={t("latitude")} error={fe("latitude")}>
          <Input
            id="property-latitude"
            type="number"
            step="any"
            {...form.register("latitude", optionalNumber)}
            className="mono"
          />
        </MetaField>
        <MetaField id="property-longitude" label={t("longitude")} error={fe("longitude")}>
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
            <MetaField id="property-bedrooms" label={t("bedrooms")} error={fe("bedrooms")}>
              <Input
                id="property-bedrooms"
                type="number"
                {...form.register("bedrooms", requiredNumber)}
                className="mono"
              />
            </MetaField>
            <MetaField id="property-bathrooms" label={t("bathrooms")} error={fe("bathrooms")}>
              <Input
                id="property-bathrooms"
                type="number"
                {...form.register("bathrooms", requiredNumber)}
                className="mono"
              />
            </MetaField>
            <MetaField id="property-floors" label={t("floors")} error={fe("floors")}>
              <Input
                id="property-floors"
                type="number"
                {...form.register("floors", requiredNumber)}
                className="mono"
              />
            </MetaField>
            <MetaField id="property-year-built" label={t("yearBuilt")} error={fe("yearBuilt")}>
              <Input
                id="property-year-built"
                type="number"
                {...form.register("yearBuilt", requiredNumberOrZero)}
                className="mono"
              />
            </MetaField>
            <MetaField id="property-garage" label={t("garageSpots")} error={fe("garage")}>
              <Input
                id="property-garage"
                type="number"
                {...form.register("garage", optionalNullableNumber)}
                className="mono"
              />
            </MetaField>
          </>
        ) : null}
        <MetaField id="property-area" label={t("area")} error={fe("area")}>
          <Input
            id="property-area"
            type="number"
            {...form.register("area", requiredNumber)}
            className="mono"
          />
        </MetaField>
        <MetaField id="property-land-area" label={t("landArea")} error={fe("landArea")}>
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

      <MetaSection title={t("sections.classification")}>
        {CLASSIFICATION_FIELDS.map(([name, options]) => (
          <MetaField
            key={name}
            id={`property-${name}`}
            label={t(`classification.${name}`)}
          >
            <Select
              value={(form.watch(name) as string | undefined) ?? NONE}
              onValueChange={(v) =>
                form.setValue(name, (v === NONE ? undefined : v) as never)
              }
            >
              <SelectTrigger id={`property-${name}`}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {options.map((o) => (
                  <SelectItem key={o} value={o}>
                    {t(`classificationValues.${o}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </MetaField>
        ))}
      </MetaSection>

      <MetaSection title={t("sections.amenities")}>
        {AMENITY_FIELDS.map((name) => (
          <SwitchRow
            key={name}
            label={t(`amenities.${name}`)}
            checked={form.watch(name) as boolean | undefined}
            onCheckedChange={(v) => form.setValue(name, v as never)}
          />
        ))}
      </MetaSection>

      <MetaSection title={t("sections.features")}>
        <div className="flex flex-col gap-2">
          {featureFields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-2">
              <Input
                placeholder="RO"
                {...form.register(`features.${i}.ro` as const)}
                className="flex-1"
              />
              <Input
                placeholder="EN"
                {...form.register(`features.${i}.en` as const)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeFeature(i)}
                aria-label="Remove feature"
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendFeature({ en: "", ro: "" })}
          >
            + Add feature
          </Button>
        </div>
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
