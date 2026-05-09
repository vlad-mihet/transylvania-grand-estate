"use client";

import { useEffect } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { LoadingState } from "@tge/ui";
import type { ApiArticle } from "@tge/types";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { Can } from "@/components/shared/can";
import { ArticleForm } from "@/components/forms/article-form";
import type { ArticleFormValues } from "@/lib/validations/articles";

type ArticleStatus = "draft" | "published";

export default function EditArticlePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations("Articles");
  const tc = useTranslations("Common");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("article.update")) router.replace(`/${locale}/403`);
  }, [can, router, locale]);

  const articleQuery = useQuery({
    // Editor-only fetch path: the public `/articles/:slug` strips the draft
    // JSON column to keep unpublished snapshots private. The admin endpoint
    // returns the full row so the form can pre-populate from draft and the
    // "Draft pending" chip can render.
    queryKey: ["article-admin", params.slug],
    queryFn: () =>
      apiClient<ApiArticle>(`/admin/articles/by-slug/${params.slug}`),
  });

  const updateMutation = useMutation({
    mutationFn: (input: ArticleFormValues & { mode?: "draft" | "publish" }) => {
      if (!articleQuery.data) throw new Error("Article not loaded");
      return apiClient<ApiArticle>(`/articles/${articleQuery.data.id}`, {
        method: "PATCH",
        body: input,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article", params.slug] });
      toast.success(t("updated"));
      // Slug may have changed — keep the URL aligned with the canonical slug.
      if (updated.slug && updated.slug !== params.slug) {
        router.replace(`/${locale}/articles/${updated.slug}/edit`);
      }
    },
  });

  if (!can("article.update")) return null;

  if (articleQuery.isLoading) {
    return <LoadingState label={tc("loading")} />;
  }
  if (articleQuery.isError) {
    if (articleQuery.error instanceof ApiError && articleQuery.error.status === 404) {
      notFound();
    }
  }
  if (!articleQuery.data) {
    notFound();
  }

  const article = articleQuery.data;
  // When the article has a pending draft snapshot, prefer those values for
  // the localized fields so the editor opens with what the author last saved
  // (not the live copy that was overwritten on the previous publish).
  const draft = (article as ApiArticle & {
    draft?: {
      title?: ArticleFormValues["title"];
      excerpt?: ArticleFormValues["excerpt"];
      content?: ArticleFormValues["content"];
    } | null;
  }).draft ?? null;
  const titleSource = draft?.title ?? article.title;
  const excerptSource = draft?.excerpt ?? article.excerpt;
  const contentSource = draft?.content ?? article.content;
  const defaults: Partial<ArticleFormValues> = {
    slug: article.slug,
    title: {
      ro: titleSource.ro ?? "",
      en: titleSource.en ?? "",
      fr: titleSource.fr ?? "",
      de: titleSource.de ?? "",
    },
    excerpt: {
      ro: excerptSource.ro ?? "",
      en: excerptSource.en ?? "",
      fr: excerptSource.fr ?? "",
      de: excerptSource.de ?? "",
    },
    content: {
      ro: contentSource.ro ?? "",
      en: contentSource.en ?? "",
      fr: contentSource.fr ?? "",
      de: contentSource.de ?? "",
    },
    coverImage: article.coverImage,
    category: article.category as ArticleFormValues["category"],
    tags: article.tags ?? [],
    authorName: article.authorName,
    authorAvatar: article.authorAvatar ?? undefined,
    readTimeMinutes: article.readTimeMinutes ?? undefined,
    status: (article.status as ArticleStatus | undefined) ?? "draft",
  };

  const headline = article.title.ro || article.title.en || article.slug;

  return (
    <ArticleForm
      mode="edit"
      defaultValues={defaults}
      onSubmit={(values, saveMode) =>
        updateMutation.mutate({ ...values, mode: saveMode })
      }
      loading={updateMutation.isPending}
      submissionError={updateMutation.error}
      cancelHref="/articles"
      title={headline}
      breadcrumb={
        <span className="inline-flex items-center gap-3">
          <Link
            href="/articles"
            className="hover:text-foreground hover:underline"
          >
            {t("backToList")}
          </Link>
          <Can action="article.read">
            <Link
              href={`/articles/${article.slug}`}
              className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
            >
              <Eye className="h-3 w-3" />
              {tc("view")}
            </Link>
          </Can>
        </span>
      }
      hasPendingDraft={draft !== null}
    />
  );
}
