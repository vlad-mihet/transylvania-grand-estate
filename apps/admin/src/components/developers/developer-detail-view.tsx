"use client";

import { useTranslations } from "next-intl";
import type { ApiDeveloper } from "@tge/types";
import { Avatar } from "@/components/shared/avatar";
import { BilingualView } from "@/components/shared/bilingual-view";
import {
  DetailLayout,
  DetailMetaCard,
  MetaRow,
} from "@/components/shared/detail-layout";

interface DeveloperDetailViewProps {
  developer: ApiDeveloper;
}

export function DeveloperDetailView({ developer }: DeveloperDetailViewProps) {
  const t = useTranslations("DeveloperForm");
  const tc = useTranslations("Common");

  const yesNo = (value: boolean | null | undefined) =>
    value == null ? undefined : value ? tc("yes") : tc("no");

  return (
    <DetailLayout
      main={
        <>
          <div className="flex items-center gap-4 rounded-md border border-border bg-card p-5">
            <Avatar
              src={developer.logo}
              alt={developer.name}
              size="xl"
              shape="rounded"
              fit="contain"
            />
            <p className="text-base font-semibold text-foreground">
              {developer.name}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <BilingualView
              label={t("shortDescription")}
              valueEn={developer.shortDescription?.en}
              valueRo={developer.shortDescription?.ro}
              valueFr={developer.shortDescription?.fr}
              valueDe={developer.shortDescription?.de}
              multiline
            />
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <BilingualView
              label={t("description")}
              valueEn={developer.description?.en}
              valueRo={developer.description?.ro}
              valueFr={developer.description?.fr}
              valueDe={developer.description?.de}
              multiline
            />
          </div>
        </>
      }
      meta={
        <DetailMetaCard title={tc("meta")}>
          <MetaRow
            label={t("slug")}
            value={
              <code className="mono text-xs text-muted-foreground">
                {developer.slug}
              </code>
            }
          />
          <MetaRow label={t("city")} value={developer.city || null} />
          <MetaRow
            label={t("website")}
            value={
              developer.website ? (
                <a
                  href={developer.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-copper underline-offset-2 hover:underline"
                >
                  {developer.website}
                </a>
              ) : null
            }
          />
          <MetaRow
            label={t("projectCount")}
            value={developer.projectCount}
          />
          <MetaRow
            label={t("featuredDeveloper")}
            value={yesNo(developer.featured)}
          />
        </DetailMetaCard>
      }
    />
  );
}
