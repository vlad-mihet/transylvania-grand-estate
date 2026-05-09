"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Button } from "@tge/ui";
import type { ApiArticle } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { Can } from "@/components/shared/can";
import { DetailView } from "@/components/shared/detail-view";
import { EntityDeleteButton } from "@/components/shared/entity-delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { DetailPageShell } from "@/components/resource/detail-page-shell";
import {
  ArticleDetailView,
  type ArticleDetailPayload,
} from "@/components/articles/article-detail-view";

export default function ArticleViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useTranslations("Articles");
  const tc = useTranslations("Common");

  return (
    <DetailPageShell<ArticleDetailPayload>
      queryKey={["article-admin", slug]}
      // Admin endpoint returns the row with the `draft` JSON column intact so
      // we can offer the Live/Draft toggle. The public `/articles/:slug`
      // strips it.
      queryFn={() =>
        apiClient<ApiArticle>(`/admin/articles/by-slug/${slug}`) as Promise<
          ArticleDetailPayload
        >
      }
      enabled={!!slug}
      notFoundTitle={t("notFound")}
      render={(article) => {
        const headline =
          article.title.ro || article.title.en || article.slug;
        return (
          <DetailView>
            <PageHeader
              title={headline}
              breadcrumb={
                <Link
                  href="/articles"
                  className="hover:text-foreground hover:underline"
                >
                  {t("backToList")}
                </Link>
              }
              actions={
                <>
                  <EntityDeleteButton
                    apiPath={`/articles/${article.id}`}
                    permission="article.delete"
                    listHref="/articles"
                    invalidateKeys={[
                      ["articles"],
                      ["article-admin", article.slug],
                    ]}
                    confirmTitle={t("deleteTitle")}
                    confirmDescription={t("deleteDescription")}
                    successMessage={t("deleted")}
                    errorMessage={t("deleteFailed")}
                  />
                  <Can action="article.update">
                    <Button asChild size="sm">
                      <Link href={`/articles/${article.slug}/edit`}>
                        <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">{tc("edit")}</span>
                      </Link>
                    </Button>
                  </Can>
                </>
              }
            />
            <ArticleDetailView article={article} />
          </DetailView>
        );
      }}
    />
  );
}
