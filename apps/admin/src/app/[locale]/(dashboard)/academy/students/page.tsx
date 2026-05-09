"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@tge/ui";
import { apiClient } from "@/lib/api-client";
import { Can } from "@/components/shared/can";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  FilterRail,
  FilterGroup,
  FilterCheckbox,
} from "@/components/shared/filter-rail";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { type ColumnDef } from "@/components/resource/resource-table";
import { useResourceList } from "@/hooks/use-resource-list";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { BulkGrantDialog } from "./_components/bulk-grant-dialog";
import { InviteStudentDialog } from "./_components/invite-student-dialog";
import { StudentPeekSheet } from "./_components/student-peek-sheet";
import { flags } from "@/lib/flags";

type Student = {
  id: string;
  email: string;
  name: string;
  locale: string | null;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { enrollments: number };
};

type VerifiedFilter = "verified" | "unverified";

type Course = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
};

export default function AcademyStudentsPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("Academy.students");
  const tc = useTranslations("Common");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkGrantOpen, setBulkGrantOpen] = useState(false);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [verifiedFilters, setVerifiedFilters] = useState<Set<VerifiedFilter>>(
    () => new Set(),
  );

  // Server accepts `verified=true|false`; only pipe it through when
  // exactly one filter chip is active. Both selected (or neither) means
  // "no filter" so we omit the param. When EMAIL_VERIFICATION_DISABLED is
  // on every student is auto-verified at signup, so the filter would just
  // produce "all" or "none" — we hide it (and the column) entirely.
  const verifiedParam =
    !flags.emailVerificationDisabled && verifiedFilters.size === 1
      ? verifiedFilters.has("verified")
        ? "true"
        : "false"
      : undefined;

  const list = useResourceList<Student>({
    resource: "academy-students",
    endpoint: "/admin/academy/users",
    defaultSort: "newest",
    defaultLimit: 25,
    extraParams: { verified: verifiedParam },
  });

  // Loaded once, scoped by the users list's active page so the invite
  // dialog always has a fresh course picker.
  const coursesQuery = useQuery({
    queryKey: ["academy-courses-brief"],
    queryFn: () =>
      apiClient<{ data: Course[] }>("/admin/academy/courses?limit=100", {
        envelope: true,
      }),
    enabled: inviteOpen || bulkGrantOpen,
  });

  const columns: ColumnDef<Student, unknown>[] = [
    {
      id: "name",
      header: t("columnName"),
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPeekId(row.original.id);
          }}
          className="text-left font-medium hover:text-copper hover:underline"
        >
          {row.original.name}
        </button>
      ),
    },
    {
      id: "email",
      header: t("columnEmail"),
      cell: ({ row }) => (
        <Mono className="text-muted-foreground">{row.original.email}</Mono>
      ),
    },
    {
      id: "locale",
      header: t("columnLocale"),
      cell: ({ row }) => (
        <span className="text-xs text-foreground/80">
          {row.original.locale ?? t("localeUnset")}
        </span>
      ),
    },
    ...(flags.emailVerificationDisabled
      ? []
      : [
          {
            id: "verified",
            header: t("columnVerified"),
            cell: ({ row }) => (
              <StatusBadge
                status={
                  row.original.emailVerifiedAt ? "verified" : "unverified"
                }
                tone={row.original.emailVerifiedAt ? "success" : "warning"}
              />
            ),
          } as ColumnDef<Student, unknown>,
        ]),
    {
      id: "enrollments",
      header: t("columnEnrollments"),
      cell: ({ row }) => <Mono>{row.original._count.enrollments}</Mono>,
    },
    {
      id: "lastLoginAt",
      header: t("columnLastLogin"),
      cell: ({ row }) =>
        row.original.lastLoginAt ? (
          <RelativeTime value={row.original.lastLoginAt} />
        ) : (
          <span className="text-xs text-muted-foreground">
            {t("lastLoginNever")}
          </span>
        ),
    },
  ];

  return (
    <>
      <ResourceListPage<Student>
        title={t("listTitle")}
        description={t("listDescription")}
        list={list}
        columns={columns}
        searchPlaceholder={t("searchPlaceholder")}
        sortOptions={[
          { value: "newest", label: tc("sortNewest") },
          { value: "oldest", label: tc("sortOldest") },
        ]}
        filterRail={
          flags.emailVerificationDisabled ? undefined : (
            <FilterRail
              activeCount={verifiedFilters.size}
              onClear={() => setVerifiedFilters(new Set())}
            >
              <FilterGroup title={t("filterVerifiedTitle")}>
                <FilterCheckbox
                  label={t("verifiedYes")}
                  checked={verifiedFilters.has("verified")}
                  onChange={(checked) =>
                    setVerifiedFilters((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add("verified");
                      else next.delete("verified");
                      return next;
                    })
                  }
                />
                <FilterCheckbox
                  label={t("verifiedNo")}
                  checked={verifiedFilters.has("unverified")}
                  onChange={(checked) =>
                    setVerifiedFilters((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add("unverified");
                      else next.delete("unverified");
                      return next;
                    })
                  }
                />
              </FilterGroup>
            </FilterRail>
          )
        }
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyDescription")}
        emptyAction={
          <Can action="academy.user.manage">
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              {t("inviteLabel")}
            </Button>
          </Can>
        }
        headerActions={
          <Can action="academy.user.manage">
            <ExportCsvButton path="/admin/academy/users/export.csv" />
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              {t("inviteLabel")}
            </Button>
          </Can>
        }
        bulkActions={(selection) => (
          <Can action="academy.user.manage">
            <Button
              size="sm"
              onClick={() => setBulkGrantOpen(true)}
              disabled={selection.size === 0}
            >
              {t("bulkGrantAction", { count: selection.size })}
            </Button>
          </Can>
        )}
      />

      <InviteStudentDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        courses={coursesQuery.data?.data ?? []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["academy-students"] });
          setInviteOpen(false);
        }}
      />

      <BulkGrantDialog
        open={bulkGrantOpen}
        onOpenChange={setBulkGrantOpen}
        userIds={Array.from(list.selection)}
        courses={coursesQuery.data?.data ?? []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["academy-students"] });
          list.clearSelection();
          setBulkGrantOpen(false);
        }}
      />

      <StudentPeekSheet
        studentId={peekId}
        onOpenChange={(open) => {
          if (!open) setPeekId(null);
        }}
      />
    </>
  );
}
