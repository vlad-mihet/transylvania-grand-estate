"use client";

import { useTranslations } from "next-intl";
import type { ApiAgent } from "@tge/types";
import { Avatar } from "@/components/shared/avatar";
import { SectionCard } from "@/components/shared/section-card";
import { DefinitionList } from "@/components/shared/definition-list";
import { BilingualView } from "@/components/shared/bilingual-view";
import { StatusBadge } from "@/components/shared/status-badge";

interface AgentDetailViewProps {
  agent: ApiAgent;
}

export function AgentDetailView({ agent }: AgentDetailViewProps) {
  const t = useTranslations("AgentForm");

  return (
    <>
      <SectionCard title={t("title")}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
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
          <DefinitionList
            items={[
              { label: t("firstName"), value: agent.firstName },
              { label: t("lastName"), value: agent.lastName },
              {
                label: t("slug"),
                value: (
                  <code className="mono text-xs text-muted-foreground">
                    {agent.slug}
                  </code>
                ),
                wide: true,
              },
              { label: t("email"), value: agent.email || null },
              { label: t("phone"), value: agent.phone || null },
            ]}
          />
          <BilingualView
            label={t("bio")}
            valueEn={agent.bio?.en}
            valueRo={agent.bio?.ro}
            valueFr={agent.bio?.fr}
            valueDe={agent.bio?.de}
            multiline
          />
        </div>
      </SectionCard>
    </>
  );
}
