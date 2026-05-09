"use client";

import { useTranslations } from "next-intl";
import type { ApiAgent } from "@tge/types";
import { Avatar } from "@/components/shared/avatar";
import { BilingualView } from "@/components/shared/bilingual-view";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DetailLayout,
  DetailMetaCard,
  MetaRow,
} from "@/components/shared/detail-layout";

interface AgentDetailViewProps {
  agent: ApiAgent;
}

export function AgentDetailView({ agent }: AgentDetailViewProps) {
  const t = useTranslations("AgentForm");
  const tc = useTranslations("Common");

  return (
    <DetailLayout
      main={
        <>
          <div className="flex items-center gap-4 rounded-md border border-border bg-card p-5">
            <Avatar
              src={agent.photo}
              alt={`${agent.firstName} ${agent.lastName}`}
              size="xl"
            />
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">
                {agent.firstName} {agent.lastName}
              </p>
              <div className="mt-1">
                <StatusBadge status={agent.active ? "active" : "inactive"} />
              </div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <BilingualView
              label={t("bio")}
              valueEn={agent.bio?.en}
              valueRo={agent.bio?.ro}
              valueFr={agent.bio?.fr}
              valueDe={agent.bio?.de}
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
                {agent.slug}
              </code>
            }
          />
          <MetaRow label={t("email")} value={agent.email || null} />
          <MetaRow label={t("phone")} value={agent.phone || null} />
        </DetailMetaCard>
      }
    />
  );
}
