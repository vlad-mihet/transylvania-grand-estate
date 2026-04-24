"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@tge/ui";
import { Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  FilterRail,
  FilterGroup,
  FilterCheckbox,
} from "@/components/shared/filter-rail";
import {
  ResourceListPage,
} from "@/components/resource/resource-list-page";
import { type ColumnDef } from "@/components/resource/resource-table";
import { useResourceList } from "@/hooks/use-resource-list";
import { pickTitle } from "@/lib/academy/pick-title";

type Course = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
  status: "draft" | "published" | "archived";
  visibility: "public" | "enrolled";
  order: number;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  _count: { lessons: number };
};

type StatusFilter = "draft" | "published" | "archived";

const STATUS_VALUES: StatusFilter[] = ["draft", "published", "archived"];

export default function AcademyCoursesPage() {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations("Academy.courses");
  const tStatus = useTranslations("Academy.statuses");
  const tc = useTranslations("Common");
  const tt = useTranslations("Academy.toasts");

  const [statusFilters, setStatusFilters] = useState<Set<StatusFilter>>(
    () => new Set(),
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const statusParam =
    statusFilters.size === 1 ? Array.from(statusFilters)[0] : undefined;

  const list = useResourceList<Course>({
    resource: "academy-courses",
    endpoint: "/admin/academy/courses",
    defaultSort: "order",
    defaultLimit: 25,
    extraParams: { status: statusParam },
  });

  const impactQuery = useQuery({
    enabled: !!deleteId,
    queryKey: ["academy-course-delete-impact", deleteId],
    queryFn: () =>
      apiClient<{ lessonCount: number; activeEnrollmentCount: number }>(
        `/admin/academy/courses/${deleteId}/delete-impact`,
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/academy/courses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-courses"] });
      toast.success(tt("courseDeleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(tt("courseDeleteFailed")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) =>
          apiClient(`/admin/academy/courses/${id}`, { method: "DELETE" }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academy-courses"] });
      toast.success(tt("courseDeleted"));
      list.clearSelection();
      setBulkDeleteOpen(false);
    },
    onError: () => toast.error(tt("courseDeleteFailed")),
  });

  const toggleStatus = (status: StatusFilter) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const columns: ColumnDef<Course, unknown>[] = [
    {
      id: "title",
      header: t("columnTitle"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link
            href={`/academy/courses/${row.original.id}`}
            className="block truncate text-sm font-medium text-foreground hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {pickTitle(row.original.title, row.original.slug, locale)}
          </Link>
          <Mono className="block truncate text-[11px] text-muted-foreground">
            {row.original.slug}
          </Mono>
        </div>
      ),
    },
    {
      id: "status",
      header: t("columnStatus"),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "visibility",
      header: t("columnVisibility"),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.visibility}
          tone={row.original.visibility === "public" ? "info" : "neutral"}
        />
      ),
    },
    {
      id: "lessons",
      header: t("columnLessons"),
      cell: ({ row }) => <Mono>{row.original._count.lessons}</Mono>,
    },
    {
      id: "order",
      header: t("columnOrder"),
      cell: ({ row }) => <Mono>{row.original.order}</Mono>,
    },
    {
      id: "updatedAt",
      header: tc("columnUpdated"),
      cell: ({ row }) => (
        <RelativeTime value={row.original.updatedAt ?? row.original.createdAt} />
      ),
    },
    {
      id: "actions",
      header: "",
      size: 64,
      enableSorting: false,
      cell: ({ row }) => (
        <Can action="academy.course.delete">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(row.original.id);
            }}
            className="text-[var(--color-danger)] hover:underline"
            aria-label={t("deleteAriaLabel", {
              title: pickTitle(row.original.title, row.original.slug, locale),
            })}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Can>
      ),
    },
  ];

  const impact = impactQuery.data;
  const impactDescription = deleteId
    ? impact
      ? t("deleteImpact", {
          lessonCount: impact.lessonCount,
          studentCount: impact.activeEnrollmentCount,
        })
      : t("deleteImpactCalculating")
    : undefined;

  return (
    <>
      <ResourceListPage<Course>
        title={t("listTitle")}
        description={t("listDescription")}
        list={list}
        columns={columns}
        searchPlaceholder={t("searchPlaceholder")}
        sortOptions={[
          { value: "order", label: t("sortOrder") },
          { value: "newest", label: t("sortNewest") },
          { value: "oldest", label: t("sortOldest") },
        ]}
        activeFilters={statusFilters.size}
        filterRail={
          <FilterRail
            activeCount={statusFilters.size}
            onClear={() => setStatusFilters(new Set())}
          >
            <FilterGroup title={t("columnStatus")}>
              {STATUS_VALUES.map((s) => (
                <FilterCheckbox
                  key={s}
                  label={tStatus(s)}
                  checked={statusFilters.has(s)}
                  onChange={() => toggleStatus(s)}
                />
              ))}
            </FilterGroup>
          </FilterRail>
        }
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyDescription")}
        emptyAction={
          <Can action="academy.course.create">
            <Button asChild size="sm">
              <Link href="/academy/courses/new">{t("createLabel")}</Link>
            </Button>
          </Can>
        }
        headerActions={
          <Can action="academy.course.create">
            <Button asChild size="sm">
              <Link href="/academy/courses/new">{t("createLabel")}</Link>
            </Button>
          </Can>
        }
        bulkActions={(selection) => (
          <Can action="academy.course.delete">
            <Button
              variant="outline"
              size="sm"
              className="text-[var(--color-danger)] border-[color-mix(in_srgb,var(--color-danger)_30%,var(--border))] hover:bg-[var(--color-danger-bg)]"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={selection.size === 0}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {t("bulkDelete")}
            </Button>
          </Can>
        )}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t("deleteTitle")}
        description={impactDescription}
        loading={deleteMutation.isPending}
      />

      <DeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={() =>
          bulkDeleteMutation.mutate(Array.from(list.selection))
        }
        title={t("bulkDeleteTitle", { count: list.selection.size })}
        loading={bulkDeleteMutation.isPending}
      />
    </>
  );
}
