"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@tge/ui";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";

type LocaleKey = "ro" | "en" | "fr" | "de";

interface FilledByLocale {
  ro: number;
  en: number;
  fr: number;
  de: number;
}

interface TypeStats {
  total: number;
  filledByLocale: FilledByLocale;
}

type ContentType =
  | "article"
  | "course"
  | "lesson"
  | "property"
  | "city"
  | "developer"
  | "agent"
  | "testimonial";

interface LocaleCompletenessResponse {
  byType: Record<ContentType, TypeStats>;
  missingEnTotal: number;
}

const ROW_ORDER: ContentType[] = [
  "article",
  "course",
  "lesson",
  "property",
  "city",
  "developer",
  "agent",
  "testimonial",
];

const LOCALES: readonly LocaleKey[] = ["ro", "en", "fr", "de"];

const LOCALE_LABEL: Record<LocaleKey, string> = {
  ro: "RO",
  en: "EN",
  fr: "FR",
  de: "DE",
};

export function LocaleCompletenessPanel() {
  const t = useTranslations("Content.completeness");
  const tType = useTranslations("Content.contentTypes");

  const query = useQuery({
    queryKey: ["content-locale-completeness"],
    queryFn: () =>
      apiClient<LocaleCompletenessResponse>("/admin/content/locale-completeness"),
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("title")}</CardTitle>
        <p className="text-[11px] text-muted-foreground">{t("description")}</p>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : query.isError || !query.data ? (
          <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>
        ) : (
          <div className="overflow-hidden rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="mono px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {t("colType")}
                  </th>
                  <th className="mono px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {t("colTotal")}
                  </th>
                  {LOCALES.map((l) => (
                    <th
                      key={l}
                      className="mono px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                    >
                      {LOCALE_LABEL[l]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROW_ORDER.map((type) => {
                  const stats = query.data.byType[type];
                  return (
                    <tr key={type} className="border-t border-border">
                      <td className="px-3 py-2 text-[13px] font-medium">
                        {tType(type)}
                      </td>
                      <td className="mono px-3 py-2 text-right tabular-nums text-[13px]">
                        {stats.total}
                      </td>
                      {LOCALES.map((l) => (
                        <td
                          key={l}
                          className="mono px-3 py-2 text-right tabular-nums text-[12px]"
                        >
                          <LocaleCell
                            filled={stats.filledByLocale[l]}
                            total={stats.total}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LocaleCell({ filled, total }: { filled: number; total: number }) {
  if (total === 0) return <span className="text-muted-foreground">—</span>;
  const pct = filled / total;
  const tone =
    pct === 1
      ? "text-[var(--color-success)]"
      : pct === 0
        ? "text-muted-foreground"
        : "text-[var(--color-warning)]";
  return (
    <span className={tone}>
      {filled}
      <span className="text-[10px] text-muted-foreground">/{total}</span>
    </span>
  );
}
