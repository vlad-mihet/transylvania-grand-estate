"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@tge/ui";
import { Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { ResourceListPage } from "@/components/resource/resource-list-page";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { Mono, MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";
import { Thumbnail } from "@/components/shared/thumbnail";
import { Can } from "@/components/shared/can";
import { useResourceList } from "@/hooks/use-resource-list";

import { buildArticleColumns } from "./_components/columns";
import { ArticlesFilterRail } from "./_components/filters";
import {
  SORT_TOKENS,
  type Article,
  type ArticleCategory,
  type ArticleStatus,
} from "./_components/types";

export default function ArticlesPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("Articles");
  const tc = useTranslations("Common");
  const locale = useLocale();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ArticleCategory | "">(
    "",
  );
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | "">("");

  const list = useResourceList<Article>({
    resource: "articles",
    defaultSort: "newest",
    defaultLimit: 20,
    extraParams: {
      category: categoryFilter || undefined,
      status: statusFilter || undefined,
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["articles"] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/articles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success(t("deleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) => apiClient(`/articles/${id}`, { method: "DELETE" })),
      );
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("deleted"));
      list.clearSelection();
      setBulkDeleteOpen(false);
    },
    onError: () => toast.error(t("deleteFailed")),
  });

  const setStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: ArticleStatus;
    }) =>
      apiClient(`/articles/${id}`, {
        method: "PATCH",
        body: {
          status,
          publishedAt:
            status === "published" ? new Date().toISOString() : undefined,
        },
      }),
    onSuccess: (_, variables) => {
      invalidate();
      toast.success(
        variables.status === "published" ? t("published") : t("unpublished"),
      );
    },
    onError: () => toast.error(t("statusChangeFailed")),
  });

  const bulkPublishMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const now = new Date().toISOString();
      await Promise.all(
        ids.map((id) =>
          apiClient(`/articles/${id}`, {
            method: "PATCH",
            body: { status: "published", publishedAt: now },
          }),
        ),
      );
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("published"));
      list.clearSelection();
    },
    onError: () => toast.error(t("statusChangeFailed")),
  });

  const getTitle = (a: Article): string =>
    (a.title as Record<string, string>)[locale] ?? a.title.en ?? "";

  const columns = buildArticleColumns({
    getTitle,
    onPublishToggle: setStatusMutation.mutate,
    onDelete: (id) => setDeleteId(id),
    t: (k) => t(k as Parameters<typeof t>[0]),
  });

  const activeFilters = (categoryFilter ? 1 : 0) + (statusFilter ? 1 : 0);

  return (
    <>
      <ResourceListPage<Article>
        title={t("title")}
        createHref="/articles/new"
        createLabel={t("addArticle")}
        createAction="article.create"
        list={list}
        columns={columns}
        sortTokens={SORT_TOKENS}
        sortOptions={[
          { value: "newest", label: tc("sortNewest") },
          { value: "oldest", label: tc("sortOldest") },
        ]}
        activeFilters={activeFilters}
        filterRail={
          <ArticlesFilterRail
            statusFilter={statusFilter}
            categoryFilter={categoryFilter}
            onStatusChange={setStatusFilter}
            onCategoryChange={setCategoryFilter}
            activeCount={activeFilters}
          />
        }
        emptyAction={
          <Can action="article.create">
            <Button asChild size="sm">
              <Link href="/articles/new">{t("addArticle")}</Link>
            </Button>
          </Can>
        }
        bulkActions={(selection) => (
          <>
            <Can action="article.publish">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  bulkPublishMutation.mutate(Array.from(selection))
                }
                disabled={bulkPublishMutation.isPending}
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                {t("publish")}
              </Button>
            </Can>
            <Can action="article.delete">
              <Button
                variant="outline"
                size="sm"
                className="border-[color-mix(in_srgb,var(--color-danger)_30%,var(--border))] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {tc("delete")}
              </Button>
            </Can>
          </>
        )}
        mobileCard={(article) => (
          <Link
            href={`/articles/${article.id}`}
            className="card-hover block space-y-2 rounded-md border border-border bg-card p-3"
          >
            <div className="flex gap-3">
              <Thumbnail
                src={article.coverImage}
                alt={getTitle(article)}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {getTitle(article)}
                </p>
                <Mono className="truncate text-[11px]">{article.slug}</Mono>
              </div>
              <StatusBadge status={article.status ?? "draft"} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <MonoTag>{article.category.replace(/-/g, " ")}</MonoTag>
              <span className="text-[11px] text-muted-foreground">
                {article.authorName}
              </span>
              {article.publishedAt && (
                <RelativeTime
                  value={article.publishedAt}
                  className="ml-auto"
                />
              )}
            </div>
          </Link>
        )}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t("deleteTitle")}
        loading={deleteMutation.isPending}
      />

      <DeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={() => setBulkDeleteOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(list.selection))}
        title={t("deleteTitle")}
        loading={bulkDeleteMutation.isPending}
      />
    </>
  );
}
