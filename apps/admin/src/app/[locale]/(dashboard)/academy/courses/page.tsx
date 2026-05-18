"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Archive, Eye, SlidersHorizontal, Trash2, X } from "lucide-react";
import {
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@tge/ui";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import {
  FilterRail,
  FilterGroup,
  FilterCheckbox,
} from "@/components/shared/filter-rail";
import { useResourceList } from "@/hooks/use-resource-list";
import {
  academyKeys,
  pickTitle,
  useCourseDeleteImpact,
  useDeleteCourse,
  useUpdateCourse,
} from "@/modules/academy";
import {
  CourseCard,
  type CourseCardData,
} from "@/modules/academy/components/course-card";
import { apiClient } from "@/lib/api-client";

type Course = CourseCardData & {
  order: number;
  publishedAt: string | null;
  createdAt: string;
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
  const [railOpen, setRailOpen] = useState(true);

  const statusParam =
    statusFilters.size === 1 ? Array.from(statusFilters)[0] : undefined;

  const list = useResourceList<Course>({
    resource: "academy-courses",
    endpoint: "/admin/academy/courses",
    defaultSort: "order",
    defaultLimit: 25,
    extraParams: { status: statusParam },
  });

  const impactQuery = useCourseDeleteImpact(deleteId);
  const deleteMutation = useDeleteCourse();
  const setStatusMutation = useUpdateCourse();

  const handleDelete = (id: string) =>
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(tt("courseDeleted"));
        setDeleteId(null);
      },
      onError: () => toast.error(tt("courseDeleteFailed")),
    });

  const handleSetStatus = (
    id: string,
    status: "draft" | "published" | "archived",
  ) =>
    setStatusMutation.mutate(
      { id, body: { status } },
      {
        onSuccess: () => toast.success(tt("courseStatusUpdated")),
        onError: () => toast.error(tt("courseStatusFailed")),
      },
    );

  // Bulk operations fan out to the single-course endpoint. Inline Promise.all
  // avoids a hook variant whose only purpose is batching.
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) =>
          apiClient(`/admin/academy/courses/${id}`, { method: "DELETE" }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academyKeys.courses() });
      queryClient.invalidateQueries({ queryKey: ["academy-courses"] });
      toast.success(tt("courseDeleted"));
      list.clearSelection();
      setBulkDeleteOpen(false);
    },
    onError: () => toast.error(tt("courseDeleteFailed")),
  });

  const bulkSetStatusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: "draft" | "published" | "archived";
    }) => {
      await Promise.all(
        ids.map((id) =>
          apiClient(`/admin/academy/courses/${id}`, {
            method: "PATCH",
            body: { status },
          }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: academyKeys.courses() });
      queryClient.invalidateQueries({ queryKey: ["academy-courses"] });
      toast.success(tt("courseStatusUpdated"));
      list.clearSelection();
    },
    onError: () => toast.error(tt("courseStatusFailed")),
  });

  const toggleStatus = (status: StatusFilter) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const impact = impactQuery.data;
  const impactDescription = deleteId
    ? impact
      ? t("deleteImpact", {
          lessonCount: impact.lessonCount,
          studentCount: impact.activeEnrollmentCount,
        })
      : t("deleteImpactCalculating")
    : undefined;

  const allVisibleIds = list.items.map((c) => c.id);
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => list.selection.has(id));

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <PageHeader
          title={t("listTitle")}
          description={
            list.meta
              ? `${list.meta.total} ${list.meta.total === 1 ? "item" : "items"}`
              : t("listDescription")
          }
          actions={
            <Can action="academy.course.create">
              <Button asChild size="sm">
                <Link href="/academy/courses/new">{t("createLabel")}</Link>
              </Button>
            </Can>
          }
        />

        <div className="flex min-h-0 flex-1 gap-4">
          {railOpen && (
            <div className="hidden lg:block">
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
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRailOpen((v) => !v)}
                className="hidden lg:inline-flex"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">
                  {tc("filters")}
                  {statusFilters.size > 0 && (
                    <span className="ml-1.5 mono text-[11px] text-copper">
                      {statusFilters.size}
                    </span>
                  )}
                </span>
              </Button>
              <SearchInput
                value={list.search}
                onValueChange={list.setSearch}
                placeholder={t("searchPlaceholder")}
                shortcut="⌘K"
              />
              <select
                value={list.sort ?? ""}
                onChange={(e) => list.setSort(e.target.value)}
                className="mono h-9 rounded-md border border-border bg-card px-2.5 text-xs text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="order">{t("sortOrder")}</option>
                <option value="newest">{t("sortNewest")}</option>
                <option value="oldest">{t("sortOldest")}</option>
              </select>

              {/* Select-all toggle, only visible when there are items. */}
              {list.items.length > 0 && (
                <label className="ml-auto flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() =>
                      list.selectAll(allVisibleIds, !allSelected)
                    }
                    aria-label={t("selectAllAria")}
                  />
                  <span className="text-muted-foreground">
                    {t("selectAll")}
                  </span>
                </label>
              )}
            </div>

            {/* Bulk action bar. */}
            {list.selection.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-[color-mix(in_srgb,var(--color-copper)_6%,transparent)] px-3 py-2">
                <Mono className="text-foreground">
                  {t("selectedCount", { count: list.selection.size })}
                </Mono>
                <div className="flex flex-wrap items-center gap-2">
                  <Can action="academy.course.update">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        bulkSetStatusMutation.mutate({
                          ids: Array.from(list.selection),
                          status: "published",
                        })
                      }
                      disabled={bulkSetStatusMutation.isPending}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      {t("bulkPublish")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        bulkSetStatusMutation.mutate({
                          ids: Array.from(list.selection),
                          status: "archived",
                        })
                      }
                      disabled={bulkSetStatusMutation.isPending}
                    >
                      <Archive className="mr-1.5 h-3.5 w-3.5" />
                      {t("bulkArchive")}
                    </Button>
                  </Can>
                  <Can action="academy.course.delete">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkDeleteOpen(true)}
                      className="text-[var(--color-danger)] border-[color-mix(in_srgb,var(--color-danger)_30%,var(--border))] hover:bg-[var(--color-danger-bg)]"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      {t("bulkDelete")}
                    </Button>
                  </Can>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={list.clearSelection}
                    className="text-muted-foreground"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    {tc("clear")}
                  </Button>
                </div>
              </div>
            )}

            {/* Grid body. */}
            {list.isLoading ? (
              <LoadingState label={tc("loading")} />
            ) : list.isError ? (
              <ErrorState
                onRetry={() => list.refetch()}
                retryLabel={tc("retry")}
              />
            ) : list.items.length === 0 ? (
              <EmptyState
                title={t("emptyTitle")}
                description={
                  list.search
                    ? tc("emptySearchDescription", { query: list.search })
                    : t("emptyDescription")
                }
                action={
                  <Can action="academy.course.create">
                    <Button asChild size="sm">
                      <Link href="/academy/courses/new">
                        {t("createLabel")}
                      </Link>
                    </Button>
                  </Can>
                }
                className="m-4"
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {list.items.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    title={pickTitle(course.title, course.slug, locale)}
                    selected={list.selection.has(course.id)}
                    onToggleSelect={() => list.toggleRow(course.id)}
                    onSetStatus={(status) => handleSetStatus(course.id, status)}
                    onDelete={() => setDeleteId(course.id)}
                    isStatusPending={setStatusMutation.isPending}
                  />
                ))}
              </div>
            )}

            {/* Pagination. */}
            {list.meta && list.meta.totalPages > 1 && (
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <Mono>
                  {tc("rangeOf", {
                    from: (list.page - 1) * list.limit + 1,
                    to: Math.min(list.page * list.limit, list.meta.total),
                    total: list.meta.total,
                  })}
                </Mono>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={list.page <= 1}
                    onClick={() => list.setPage(list.page - 1)}
                  >
                    {tc("back")}
                  </Button>
                  <Mono className="px-2">
                    {tc("page", {
                      current: list.page,
                      total: list.meta.totalPages,
                    })}
                  </Mono>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={list.page >= list.meta.totalPages}
                    onClick={() => list.setPage(list.page + 1)}
                  >
                    {tc("next")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
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
