"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@tge/ui";
import { apiClient } from "@/lib/api-client";
import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { type ColumnDef } from "@/components/resource/resource-table";
import { useResourceList } from "@/hooks/use-resource-list";
import { InviteStudentDialog } from "./_components/invite-student-dialog";

type Student = {
  id: string;
  email: string;
  name: string;
  locale: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { enrollments: number };
};

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

  const list = useResourceList<Student>({
    resource: "academy-students",
    endpoint: "/admin/academy/users",
    defaultSort: "newest",
    defaultLimit: 25,
  });

  // Loaded once, scoped by the users list's active page so the invite
  // dialog always has a fresh course picker.
  const coursesQuery = useQuery({
    queryKey: ["academy-courses-brief"],
    queryFn: () =>
      apiClient<{ data: Course[] }>("/admin/academy/courses?limit=100", {
        envelope: true,
      }),
    enabled: inviteOpen,
  });

  const columns: ColumnDef<Student, unknown>[] = [
    {
      id: "name",
      header: t("columnName"),
      cell: ({ row }) => (
        <Link
          href={`/academy/students/${row.original.id}`}
          className="font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.name}
        </Link>
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
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              {t("inviteLabel")}
            </Button>
          </Can>
        }
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
    </>
  );
}
