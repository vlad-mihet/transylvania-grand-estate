"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@tge/ui";
import { Eye, EyeOff } from "lucide-react";
import type { ColumnDef } from "@/components/resource/resource-table";
import { Can } from "@/components/shared/can";
import { Mono, MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { RowActions } from "@/components/shared/row-actions";
import { StatusBadge } from "@/components/shared/status-badge";
import { Thumbnail } from "@/components/shared/thumbnail";
import type { Article, ArticleStatus } from "./types";

interface BuildColumnsArgs {
  getTitle: (a: Article) => string;
  onPublishToggle: (args: { id: string; status: ArticleStatus }) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
}

export function buildArticleColumns({
  getTitle,
  onPublishToggle,
  onDelete,
  t,
}: BuildColumnsArgs): ColumnDef<Article, unknown>[] {
  return [
    {
      id: "coverImage",
      header: "",
      size: 64,
      enableSorting: false,
      cell: ({ row }) => (
        <Thumbnail
          src={row.original.coverImage}
          alt={getTitle(row.original)}
          size="sm"
        />
      ),
    },
    {
      id: "title",
      header: t("columnTitle"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {getTitle(row.original)}
          </p>
          <Mono className="truncate text-[11px] text-muted-foreground">
            {row.original.slug}
          </Mono>
        </div>
      ),
    },
    {
      id: "category",
      header: t("columnCategory"),
      cell: ({ row }) => (
        <MonoTag>{row.original.category.replace(/-/g, " ")}</MonoTag>
      ),
    },
    {
      id: "author",
      header: t("columnAuthor"),
      cell: ({ row }) => (
        <span className="truncate text-sm text-foreground/80">
          {row.original.authorName}
        </span>
      ),
    },
    {
      id: "status",
      header: t("columnStatus"),
      enableSorting: false,
      cell: ({ row }) => (
        <StatusBadge status={row.original.status ?? "draft"} />
      ),
    },
    {
      id: "readTimeMinutes",
      header: t("columnReadTime"),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.readTimeMinutes ? (
          <Mono className="text-muted-foreground">
            {row.original.readTimeMinutes}m
          </Mono>
        ) : (
          <Mono>—</Mono>
        ),
    },
    {
      id: "publishedAt",
      header: t("columnPublishedAt"),
      cell: ({ row }) =>
        row.original.publishedAt ? (
          <RelativeTime value={row.original.publishedAt} />
        ) : (
          <Mono>—</Mono>
        ),
    },
    {
      id: "actions",
      header: "",
      size: 120,
      enableSorting: false,
      cell: ({ row }) => {
        const published = row.original.status === "published";
        const publishLabel = published ? t("unpublish") : t("publish");
        return (
          <RowActions
            editHref={`/articles/${row.original.id}`}
            onDelete={() => onDelete(row.original.id)}
            permissions={{
              edit: "article.update",
              delete: "article.delete",
            }}
            extra={
              <Can action="article.publish">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={publishLabel}
                      onClick={() =>
                        onPublishToggle({
                          id: row.original.id,
                          status: published ? "draft" : "published",
                        })
                      }
                    >
                      {published ? (
                        <EyeOff className="text-muted-foreground" />
                      ) : (
                        <Eye className="text-[var(--color-success)]" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{publishLabel}</TooltipContent>
                </Tooltip>
              </Can>
            }
          />
        );
      },
    },
  ];
}
