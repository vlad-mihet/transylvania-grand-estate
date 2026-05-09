"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@tge/ui";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { Link } from "@/i18n/navigation";
import { RelativeTime } from "@/components/shared/relative-time";

type ContentType =
  | "article"
  | "course"
  | "lesson"
  | "property"
  | "city"
  | "developer"
  | "agent"
  | "testimonial";

interface MissingEnEntry {
  type: ContentType;
  id: string;
  slug: string | null;
  displayName: string;
  updatedAt: string;
  editHref: string;
}

interface LocaleCompletenessResponse {
  missingEn: MissingEnEntry[];
  missingEnTotal: number;
}

export function EnTranslationsQueue() {
  const t = useTranslations("Content.enQueue");
  const tType = useTranslations("Content.contentTypes");

  const query = useQuery({
    queryKey: ["content-locale-completeness"],
    queryFn: () =>
      apiClient<LocaleCompletenessResponse>("/admin/content/locale-completeness"),
    staleTime: 60_000,
  });

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-sm">{t("title")}</CardTitle>
          {query.data ? (
            <span className="mono text-[11px] text-muted-foreground">
              {t("count", { count: query.data.missingEnTotal })}
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">{t("description")}</p>
      </CardHeader>
      <CardContent className="flex-1">
        {query.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : query.isError || !query.data ? (
          <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>
        ) : query.data.missingEn.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {query.data.missingEn.map((entry) => (
              <li key={`${entry.type}-${entry.id}`}>
                <Link
                  href={entry.editHref as Parameters<typeof Link>[0]["href"]}
                  className="group flex items-center justify-between gap-3 py-2 text-sm hover:text-copper"
                >
                  <span className="min-w-0 flex-1">
                    <span className="mono mr-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      {tType(entry.type)}
                    </span>
                    <span className="truncate font-medium group-hover:underline">
                      {entry.displayName}
                    </span>
                  </span>
                  <RelativeTime
                    value={entry.updatedAt}
                    className="shrink-0 text-[11px] text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {query.data && query.data.missingEnTotal > query.data.missingEn.length ? (
        <CardFooter>
          <p className="text-[11px] text-muted-foreground">
            {t("moreHidden", {
              hidden: query.data.missingEnTotal - query.data.missingEn.length,
            })}
          </p>
        </CardFooter>
      ) : null}
    </Card>
  );
}
