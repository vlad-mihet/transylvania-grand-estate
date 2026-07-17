"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiAgent } from "@tge/types";

import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";

interface CountEnvelope<T = unknown> {
  data: T[];
  meta?: { total?: number };
}

function useTotal(
  key: string[],
  url: string,
  enabled: boolean,
): { total: number | undefined; isLoading: boolean } {
  const q = useQuery({
    queryKey: ["people-overview", ...key],
    queryFn: () => apiClient<CountEnvelope>(url, { envelope: true }),
    enabled,
    staleTime: 60_000,
  });
  return {
    total: q.data?.meta?.total,
    isLoading: enabled && q.isLoading,
  };
}

export interface PeopleKpis {
  team: { total: number | undefined; isLoading: boolean };
  teamPendingInvites: { total: number | undefined; isLoading: boolean };
  agents: { total: number | undefined; isLoading: boolean };
  agentsNoLogin: { total: number | undefined; isLoading: boolean };
  students: { total: number | undefined; isLoading: boolean };
  studentsPendingInvites: { total: number | undefined; isLoading: boolean };
}

export function usePeopleKpis(): PeopleKpis {
  const { can } = usePermissions();
  const canTeam = can("users.manage");
  const canAgents = can("agent.read");
  const canStudents = can("academy.user.manage");

  const team = useTotal(["team"], "/auth/users?limit=1", canTeam);
  const teamPendingInvites = useTotal(
    ["team-pending"],
    "/invitations?status=pending&limit=1",
    canTeam,
  );
  const agents = useTotal(["agents"], "/agents?limit=1", canAgents);
  const agentsNoLogin = useTotal(
    ["agents-no-login"],
    "/agents?unlinked=true&limit=1",
    canAgents,
  );
  const students = useTotal(
    ["students"],
    "/admin/academy/users?limit=1",
    canStudents,
  );
  const studentsPendingInvites = useTotal(
    ["students-pending"],
    "/admin/academy/invitations?status=pending&limit=1",
    canStudents,
  );

  return {
    team,
    teamPendingInvites,
    agents,
    agentsNoLogin,
    students,
    studentsPendingInvites,
  };
}

interface InvitationLite {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  agent?: { id: string; firstName: string; lastName: string } | null;
}

export interface RecentInvite {
  id: string;
  source: "team" | "academy";
  email: string;
  displayName: string;
  status: string;
  createdAt: string;
  href: string;
}

/**
 * Top 5 invitations across both pools, merged client-side by createdAt desc.
 * Each fetch caps at 5 — the merged set is at most 10, sliced to 5. Cheap
 * enough that a server aggregator would be premature optimization.
 */
export function useRecentInvitations() {
  const { can } = usePermissions();
  const canTeam = can("users.manage");
  const canAcademy = can("academy.user.manage");

  const teamQ = useQuery({
    queryKey: ["people-overview", "recent-team-invites"],
    queryFn: () =>
      apiClient<CountEnvelope<InvitationLite>>(
        "/invitations?sort=newest&limit=5",
        { envelope: true },
      ),
    enabled: canTeam,
    staleTime: 60_000,
  });

  const academyQ = useQuery({
    queryKey: ["people-overview", "recent-academy-invites"],
    queryFn: () =>
      apiClient<CountEnvelope<InvitationLite>>(
        "/admin/academy/invitations?sort=newest&limit=5",
        { envelope: true },
      ),
    enabled: canAcademy,
    staleTime: 60_000,
  });

  const items = useMemo<RecentInvite[]>(() => {
    const teamRows: RecentInvite[] = (teamQ.data?.data ?? []).map((row) => ({
      id: `team:${row.id}`,
      source: "team",
      email: row.email,
      displayName: row.agent
        ? `${row.agent.firstName} ${row.agent.lastName}`.trim()
        : row.email,
      status: row.status,
      createdAt: row.createdAt,
      href: "/people/invitations?tab=team",
    }));
    const academyRows: RecentInvite[] = (academyQ.data?.data ?? []).map(
      (row) => ({
        id: `academy:${row.id}`,
        source: "academy",
        email: row.email,
        displayName: row.email,
        status: row.status,
        createdAt: row.createdAt,
        href: "/academy/invitations",
      }),
    );
    return [...teamRows, ...academyRows]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 5);
  }, [teamQ.data, academyQ.data]);

  return {
    items,
    isLoading:
      (canTeam && teamQ.isLoading) || (canAcademy && academyQ.isLoading),
    isEnabled: canTeam || canAcademy,
  };
}

interface AuditEntry {
  id: string;
  action: string;
  actorId: string | null;
  actor: { id: string; email: string; name: string | null } | null;
  createdAt: string;
}

export interface RecentSignin {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

/**
 * Last 5 successful login events. Pulls from the audit-log firehose; gated
 * behind audit-log.read. EDITORs without audit access just don't see the card.
 * The audit action for a password login is `user.login-password` — querying
 * the non-existent `auth.login` returned nothing, so the card was always empty
 * (BUG-119).
 */
export function useRecentSignins() {
  const { can } = usePermissions();
  const enabled = can("audit-log.read");

  const q = useQuery({
    queryKey: ["people-overview", "recent-signins"],
    queryFn: () =>
      apiClient<CountEnvelope<AuditEntry>>(
        "/audit-logs?action=user.login-password&limit=5",
        { envelope: true },
      ),
    enabled,
    staleTime: 60_000,
  });

  const items = useMemo<RecentSignin[]>(() => {
    return (q.data?.data ?? []).map((entry) => ({
      id: entry.id,
      displayName:
        entry.actor?.name?.trim() ||
        entry.actor?.email ||
        entry.actorId ||
        "—",
      email: entry.actor?.email ?? "",
      createdAt: entry.createdAt,
    }));
  }, [q.data]);

  return {
    items,
    isLoading: enabled && q.isLoading,
    isEnabled: enabled,
  };
}

type OverviewAgentRow = Pick<ApiAgent, "id" | "email">;
interface OverviewUserRow {
  id: string;
  email: string;
}

/**
 * Lightweight overlap counter — fetches the email column from each pool
 * (capped at 500 per pool to keep the round-trip small) and intersects on
 * lowercased email. A real /admin/people/overlaps endpoint is deferred until
 * a pool exceeds 500 entries.
 */
export function useEmailOverlap() {
  const { can } = usePermissions();
  const canTeam = can("users.manage");
  const canAgents = can("agent.read");
  const canStudents = can("academy.user.manage");
  // Overlap is only meaningful when at least two pools are visible to the
  // caller. Fewer than two? Skip the work and the card.
  const visible = [canTeam, canAgents, canStudents].filter(Boolean).length;
  const enabled = visible >= 2;

  const teamQ = useQuery({
    queryKey: ["people-overview", "overlap-team"],
    queryFn: () =>
      apiClient<CountEnvelope<OverviewUserRow>>(
        "/auth/users?limit=500",
        { envelope: true },
      ),
    enabled: enabled && canTeam,
    staleTime: 5 * 60_000,
  });

  const agentsQ = useQuery({
    queryKey: ["people-overview", "overlap-agents"],
    queryFn: () =>
      apiClient<CountEnvelope<OverviewAgentRow>>(
        "/agents?limit=500",
        { envelope: true },
      ),
    enabled: enabled && canAgents,
    staleTime: 5 * 60_000,
  });

  const studentsQ = useQuery({
    queryKey: ["people-overview", "overlap-students"],
    queryFn: () =>
      apiClient<CountEnvelope<OverviewUserRow>>(
        "/admin/academy/users?limit=500",
        { envelope: true },
      ),
    enabled: enabled && canStudents,
    staleTime: 5 * 60_000,
  });

  const overlapCount = useMemo(() => {
    if (!enabled) return 0;
    const teamSet = new Set(
      (teamQ.data?.data ?? []).map((u) => u.email.toLowerCase()),
    );
    const agentSet = new Set(
      (agentsQ.data?.data ?? []).map((u) => u.email.toLowerCase()),
    );
    const studentSet = new Set(
      (studentsQ.data?.data ?? []).map((u) => u.email.toLowerCase()),
    );
    const allEmails = new Set<string>([
      ...teamSet,
      ...agentSet,
      ...studentSet,
    ]);
    let count = 0;
    for (const email of allEmails) {
      const matches =
        Number(teamSet.has(email)) +
        Number(agentSet.has(email)) +
        Number(studentSet.has(email));
      if (matches >= 2) count += 1;
    }
    return count;
  }, [enabled, teamQ.data, agentsQ.data, studentsQ.data]);

  return {
    count: overlapCount,
    isLoading:
      enabled &&
      ((canTeam && teamQ.isLoading) ||
        (canAgents && agentsQ.isLoading) ||
        (canStudents && studentsQ.isLoading)),
    isEnabled: enabled,
  };
}
