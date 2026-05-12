"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@tge/ui";
import { useRouter } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { TeamInvitationsList } from "./_components/team-invitations-list";
import { AcademyInvitationsList } from "./_components/academy-invitations-list";

type Tab = "team" | "academy";

export default function PeopleInvitationsPage() {
  const t = useTranslations("People.invitations");
  const router = useRouter();
  const { can } = usePermissions();
  const canTeam = can("users.manage");
  const canAcademy = can("academy.user.manage");

  // Default to whichever tab the caller can actually see. Unauthorized callers
  // get bounced to /403 — the sidebar already hides this entry, but a stale
  // bookmark could land here directly.
  const defaultTab: Tab = canTeam ? "team" : "academy";
  const [tab, setTab] = useQueryState<Tab>(
    "tab",
    parseAsStringEnum<Tab>(["team", "academy"]).withDefault(defaultTab),
  );

  useEffect(() => {
    if (!canTeam && !canAcademy) router.replace("/403");
  }, [canTeam, canAcademy, router]);

  // If the URL says "team" but the caller only has academy access (or vice
  // versa), silently flip to the visible tab so the page renders something
  // useful instead of a 403-feel empty card.
  useEffect(() => {
    if (tab === "team" && !canTeam && canAcademy) setTab("academy");
    if (tab === "academy" && !canAcademy && canTeam) setTab("team");
  }, [tab, canTeam, canAcademy, setTab]);

  if (!canTeam && !canAcademy) return null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("pageTitle")} description={t("description")} />

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList>
          {canTeam && (
            <TabsTrigger value="team">{t("tabs.team")}</TabsTrigger>
          )}
          {canAcademy && (
            <TabsTrigger value="academy">{t("tabs.academy")}</TabsTrigger>
          )}
        </TabsList>

        {canTeam && (
          <TabsContent value="team" className="mt-4">
            <TeamInvitationsList />
          </TabsContent>
        )}
        {canAcademy && (
          <TabsContent value="academy" className="mt-4">
            <AcademyInvitationsList />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
