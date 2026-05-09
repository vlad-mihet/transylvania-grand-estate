"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUp, X } from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import type { ApiBrand, ApiCity } from "@tge/types";

import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { usePermissions } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Mono } from "@/components/shared/mono";

interface SiteConfigShape {
  tgeHomepageCities?: string[];
  reveryHomepageCities?: string[];
}

interface PaginatedResponse<T> {
  data: T[];
}

const PANEL_FIELD: Record<ApiBrand, "tgeHomepageCities" | "reveryHomepageCities"> = {
  tge: "tgeHomepageCities",
  revery: "reveryHomepageCities",
};

const PANEL_LABEL: Record<ApiBrand, string> = {
  tge: "TGE",
  revery: "Revery",
};

export default function BrandVisibilityPage() {
  const router = useRouter();
  const t = useTranslations("BrandVisibility");
  const tc = useTranslations("Common");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("site-config.update")) router.replace("/403");
  }, [can, router]);

  if (!can("site-config.update")) return null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("title")} description={t("description")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <BrandPanel brand="tge" />
        <BrandPanel brand="revery" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("footnote")}</p>
      <span className="sr-only">{tc("save")}</span>
    </div>
  );
}

interface BrandPanelProps {
  brand: ApiBrand;
}

function BrandPanel({ brand }: BrandPanelProps) {
  const queryClient = useQueryClient();
  const t = useTranslations("BrandVisibility");
  const tc = useTranslations("Common");

  // Site config drives the persisted curation list. We seed local state from
  // the response so reorder/add/remove edits feel instant; Save then PATCHes
  // the full array. A pessimistic save-button flow (rather than autosave)
  // keeps batch edits atomic and lets the admin review before committing.
  const { data: siteConfig } = useQuery({
    queryKey: ["site-config"],
    queryFn: () => apiClient<SiteConfigShape>("/site-config"),
  });

  const persisted = useMemo<string[]>(
    () => siteConfig?.[PANEL_FIELD[brand]] ?? [],
    [siteConfig, brand],
  );

  const [draft, setDraft] = useState<string[] | null>(null);
  // Sync local draft when the persisted list arrives or changes externally,
  // but only when the user hasn't started editing — otherwise we'd clobber
  // their in-progress changes on every refetch.
  useEffect(() => {
    if (draft === null) setDraft(persisted);
  }, [persisted, draft]);

  const list = draft ?? persisted;

  // Brand-tagged cities — the autocomplete data source. We pass `?brand=`
  // so the dropdown only suggests cities actually visible to this brand;
  // adding an untagged city to the curation list still works (the panel
  // shows a soft warning) but isn't a default affordance.
  const { data: brandCitiesRaw } = useQuery({
    queryKey: ["cities", { brand, light: true }],
    queryFn: () =>
      apiClient<PaginatedResponse<ApiCity> | ApiCity[]>(
        `/cities?brand=${brand}&limit=200`,
      ),
  });
  const brandCities: ApiCity[] = useMemo(() => {
    if (!brandCitiesRaw) return [];
    return Array.isArray(brandCitiesRaw) ? brandCitiesRaw : brandCitiesRaw.data;
  }, [brandCitiesRaw]);

  // Full city set — used to look up names/county for slugs in the curation
  // list that aren't tagged for this brand (the soft-warning case).
  const { data: allCitiesRaw } = useQuery({
    queryKey: ["cities", { all: true }],
    queryFn: () =>
      apiClient<PaginatedResponse<ApiCity> | ApiCity[]>(`/cities?limit=500`),
  });
  const allCitiesBySlug = useMemo(() => {
    const arr = !allCitiesRaw
      ? []
      : Array.isArray(allCitiesRaw)
        ? allCitiesRaw
        : allCitiesRaw.data;
    return new Map(arr.map((c) => [c.slug, c]));
  }, [allCitiesRaw]);

  const brandSlugSet = useMemo(
    () => new Set(brandCities.map((c) => c.slug)),
    [brandCities],
  );
  const inListSet = useMemo(() => new Set(list), [list]);
  const addable = useMemo(
    () => brandCities.filter((c) => !inListSet.has(c.slug)),
    [brandCities, inListSet],
  );

  const saveMutation = useMutation({
    mutationFn: (next: string[]) =>
      apiClient("/site-config", {
        method: "PATCH",
        body: { [PANEL_FIELD[brand]]: next },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-config"] });
      toast.success(t("saved", { brand: PANEL_LABEL[brand] }));
      setDraft(null);
    },
    onError: () => toast.error(t("saveFailed")),
  });

  const dirty = draft !== null && !arraysEqual(draft, persisted);

  const move = (slug: string, dir: -1 | 1) => {
    const next = [...list];
    const idx = next.indexOf(slug);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setDraft(next);
  };

  const remove = (slug: string) => {
    setDraft(list.filter((s) => s !== slug));
  };

  const add = (slug: string) => {
    if (inListSet.has(slug)) return;
    setDraft([...list, slug]);
  };

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {PANEL_LABEL[brand]}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("panelHint", { count: list.length })}
          </p>
        </div>
        <Button
          size="sm"
          disabled={!dirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate(list)}
        >
          {saveMutation.isPending ? tc("saving") : tc("save")}
        </Button>
      </header>

      <ol className="flex flex-col gap-1.5">
        {list.length === 0 ? (
          <li className="rounded-sm border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            {t("emptyList")}
          </li>
        ) : (
          list.map((slug, i) => {
            const city = allCitiesBySlug.get(slug);
            const isTagged = brandSlugSet.has(slug);
            return (
              <li
                key={slug}
                className="flex items-center gap-2 rounded-sm border border-border bg-background px-2.5 py-1.5"
              >
                <Mono className="w-6 shrink-0 text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </Mono>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {city?.name ?? slug}
                    {city?.county ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        · {city.county.code}
                      </span>
                    ) : null}
                  </p>
                  <Mono className="truncate text-[11px] text-muted-foreground">
                    {slug}
                  </Mono>
                </div>
                {!isTagged ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-sm border border-[color-mix(in_srgb,var(--color-warning)_25%,transparent)] bg-[var(--color-warning-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-warning)]"
                    title={t("untaggedWarning", {
                      brand: PANEL_LABEL[brand],
                    })}
                  >
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {t("untagged")}
                  </span>
                ) : null}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(slug, -1)}
                    disabled={i === 0}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={t("moveUp")}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(slug, 1)}
                    disabled={i === list.length - 1}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label={t("moveDown")}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(slug)}
                    className="rounded p-1 text-muted-foreground hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                    aria-label={t("removeRow")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ol>

      <div className="flex items-center gap-2">
        <Select
          value=""
          onValueChange={(slug) => add(slug)}
          disabled={addable.length === 0}
        >
          <SelectTrigger className="flex-1">
            <SelectValue
              placeholder={
                addable.length === 0 ? t("noneAddable") : t("addCity")
              }
            />
          </SelectTrigger>
          <SelectContent>
            {addable.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
                {c.county ? ` · ${c.county.code}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
