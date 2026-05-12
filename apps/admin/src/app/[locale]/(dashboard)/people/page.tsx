"use client";

import { useTranslations } from "next-intl";
import { GraduationCap, UserCircle, Users } from "lucide-react";

import { usePermissions } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { usePeopleKpis } from "@/lib/people/use-people-overview";

import { KpiCard } from "./_components/kpi-card";
import { OverlapCallout } from "./_components/overlap-callout";
import { PeopleQuickActions } from "./_components/quick-actions";
import { RecentInvitationsCard } from "./_components/recent-invitations-card";
import { RecentSigninsCard } from "./_components/recent-signins-card";

export default function PeopleHomePage() {
  const tHome = useTranslations("People.home");
  const tKpi = useTranslations("People.home.kpi");
  const { can } = usePermissions();
  const kpis = usePeopleKpis();

  const showTeam = can("users.manage");
  const showAgents = can("agent.read");
  const showStudents = can("academy.user.manage");

  // Choose a caption per tile only when the secondary count is non-zero or
  // the primary fetch is still loading — keeps the strip quiet when nothing
  // demands attention.
  const teamPending = kpis.teamPendingInvites.total ?? 0;
  const agentsNoLogin = kpis.agentsNoLogin.total ?? 0;
  const studentsPending = kpis.studentsPendingInvites.total ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={tHome("title")}
        description={tHome("description")}
        actions={<PeopleQuickActions />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {showTeam && (
          <KpiCard
            label={tKpi("team")}
            icon={Users}
            href="/people/team"
            total={kpis.team.total}
            isLoading={kpis.team.isLoading}
            caption={tKpi("pendingInvites", { count: teamPending })}
            captionAttention={teamPending > 0}
          />
        )}
        {showAgents && (
          <KpiCard
            label={tKpi("agents")}
            icon={UserCircle}
            href="/people/agents"
            total={kpis.agents.total}
            isLoading={kpis.agents.isLoading}
            caption={tKpi("noLogin", { count: agentsNoLogin })}
            captionAttention={agentsNoLogin > 0}
          />
        )}
        {showStudents && (
          <KpiCard
            label={tKpi("students")}
            icon={GraduationCap}
            href="/people/students"
            total={kpis.students.total}
            isLoading={kpis.students.isLoading}
            caption={tKpi("pendingInvites", { count: studentsPending })}
            captionAttention={studentsPending > 0}
          />
        )}
      </div>

      <OverlapCallout />

      <div className="grid gap-5 lg:grid-cols-2">
        <RecentInvitationsCard />
        <RecentSigninsCard />
      </div>
    </div>
  );
}
