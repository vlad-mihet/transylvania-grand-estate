"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { ArticleForm } from "@/components/forms/article-form";
import type { ArticleFormValues } from "@/lib/validations/articles";

type CreatedArticle = { id: string; slug: string };

export default function NewArticlePage() {
  const router = useRouter();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations("Articles");
  const { can } = usePermissions();

  useEffect(() => {
    if (!can("article.create")) router.replace(`/${locale}/403`);
  }, [can, router, locale]);

  const createMutation = useMutation({
    mutationFn: (input: ArticleFormValues) =>
      apiClient<CreatedArticle>("/articles", {
        method: "POST",
        body: input,
      }),
    onSuccess: (article) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success(t("created"));
      router.push(`/${locale}/articles/${article.slug}/edit`);
    },
  });

  if (!can("article.create")) return null;

  return (
    <ArticleForm
      mode="create"
      onSubmit={(values) => createMutation.mutate(values)}
      loading={createMutation.isPending}
      submissionError={createMutation.error}
      cancelHref="/articles"
      title={t("newArticle")}
      breadcrumb={
        <Link href="/articles" className="hover:text-foreground hover:underline">
          {t("backToList")}
        </Link>
      }
    />
  );
}
