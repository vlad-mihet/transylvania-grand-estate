"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@tge/ui";
import {
  ArrowRight,
  GraduationCap,
  Mail,
  Newspaper,
  Plus,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";
import { usePermissions } from "@/components/auth/auth-provider";
import { pickTitle } from "@/lib/academy/pick-title";
import { LocaleCompletenessPanel } from "./_components/locale-completeness-panel";
import { EnTranslationsQueue } from "./_components/en-translations-queue";

type Article = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
  status?: string;
  updatedAt?: string;
  publishedAt?: string;
};

type Course = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
  status: "draft" | "published" | "archived";
  updatedAt: string;
};

type Envelope<T> = {
  data: T[];
  meta: { total: number };
};

export default function ContentOverviewPage() {
  const t = useTranslations("Content");
  const { can } = usePermissions();

  const showArticles = can("article.read");
  const showCourses = can("academy.course.read");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <LocaleCompletenessPanel />
        </div>
        <div className="lg:col-span-4">
          <EnTranslationsQueue />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {showArticles ? <ArticlesOverviewCard /> : null}
        {showCourses ? <CoursesOverviewCard /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("quickActionsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Can action="article.create">
            <Button asChild variant="outline" size="sm">
              <Link href="/articles/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("quickNewArticle")}
              </Link>
            </Button>
          </Can>
          <Can action="academy.course.create">
            <Button asChild variant="outline" size="sm">
              <Link href="/academy/courses/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("quickNewCourse")}
              </Link>
            </Button>
          </Can>
          <Can action="academy.user.manage">
            <Button asChild variant="outline" size="sm">
              <Link href="/academy/students">
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                {t("quickInviteStudent")}
              </Link>
            </Button>
          </Can>
        </CardContent>
      </Card>
    </div>
  );
}

function ArticlesOverviewCard() {
  const t = useTranslations("Content");
  const locale = useLocale();

  const totalQuery = useQuery({
    queryKey: ["content-articles-total"],
    queryFn: () =>
      apiClient<Envelope<Article>>("/articles?limit=1", { envelope: true }),
  });
  const draftsQuery = useQuery({
    queryKey: ["content-articles-drafts"],
    queryFn: () =>
      apiClient<Envelope<Article>>("/articles?status=draft&limit=1", {
        envelope: true,
      }),
  });
  const recentQuery = useQuery({
    queryKey: ["content-articles-recent"],
    queryFn: () =>
      apiClient<Envelope<Article>>("/articles?sort=newest&limit=5", {
        envelope: true,
      }),
  });

  const total = totalQuery.data?.meta.total ?? 0;
  const drafts = draftsQuery.data?.meta.total ?? 0;
  const published = Math.max(0, total - drafts);
  const recent = recentQuery.data?.data ?? [];
  const isLoading =
    totalQuery.isLoading || draftsQuery.isLoading || recentQuery.isLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-copper" />
          <CardTitle className="text-sm">{t("articlesTitle")}</CardTitle>
        </div>
        <StatPills
          total={total}
          drafts={drafts}
          published={published}
          loading={isLoading}
        />
      </CardHeader>
      <CardContent>
        <RecentList
          items={recent.map((a) => ({
            id: a.id,
            href: `/articles/${a.slug}/edit`,
            title: a.title[locale] ?? a.title.en ?? a.title.ro ?? a.slug,
            status: a.status ?? "draft",
            timestamp: a.updatedAt ?? a.publishedAt ?? null,
          }))}
          loading={recentQuery.isLoading}
          emptyLabel={t("noRecent")}
        />
      </CardContent>
      <CardFooter>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link href="/articles">
            {t("viewAll")}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function CoursesOverviewCard() {
  const t = useTranslations("Content");
  const locale = useLocale();

  const totalQuery = useQuery({
    queryKey: ["content-courses-total"],
    queryFn: () =>
      apiClient<Envelope<Course>>("/admin/academy/courses?limit=1", {
        envelope: true,
      }),
  });
  const draftsQuery = useQuery({
    queryKey: ["content-courses-drafts"],
    queryFn: () =>
      apiClient<Envelope<Course>>(
        "/admin/academy/courses?status=draft&limit=1",
        { envelope: true },
      ),
  });
  const archivedQuery = useQuery({
    queryKey: ["content-courses-archived"],
    queryFn: () =>
      apiClient<Envelope<Course>>(
        "/admin/academy/courses?status=archived&limit=1",
        { envelope: true },
      ),
  });
  const recentQuery = useQuery({
    queryKey: ["content-courses-recent"],
    queryFn: () =>
      apiClient<Envelope<Course>>(
        "/admin/academy/courses?sort=newest&limit=5",
        { envelope: true },
      ),
  });

  const total = totalQuery.data?.meta.total ?? 0;
  const drafts = draftsQuery.data?.meta.total ?? 0;
  const archived = archivedQuery.data?.meta.total ?? 0;
  const published = Math.max(0, total - drafts - archived);
  const recent = recentQuery.data?.data ?? [];
  const isLoading =
    totalQuery.isLoading ||
    draftsQuery.isLoading ||
    archivedQuery.isLoading ||
    recentQuery.isLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-copper" />
          <CardTitle className="text-sm">{t("coursesTitle")}</CardTitle>
        </div>
        <StatPills
          total={total}
          drafts={drafts}
          published={published}
          archived={archived}
          loading={isLoading}
        />
      </CardHeader>
      <CardContent>
        <RecentList
          items={recent.map((c) => ({
            id: c.id,
            href: `/academy/courses/${c.id}`,
            title: pickTitle(c.title, c.slug, locale),
            status: c.status,
            timestamp: c.updatedAt,
          }))}
          loading={recentQuery.isLoading}
          emptyLabel={t("noRecent")}
        />
      </CardContent>
      <CardFooter>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link href="/academy/courses">
            {t("viewAll")}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function StatPills({
  total,
  drafts,
  published,
  archived,
  loading,
}: {
  total: number;
  drafts: number;
  published: number;
  archived?: number;
  loading: boolean;
}) {
  const t = useTranslations("Content");
  if (loading) {
    return <Skeleton className="h-5 w-32" />;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <Pill label={t("statTotal")} value={total} />
      <Pill label={t("statDrafts")} value={drafts} accent="warning" />
      <Pill label={t("statPublished")} value={published} accent="success" />
      {typeof archived === "number" ? (
        <Pill label={t("statArchived")} value={archived} />
      ) : null}
    </div>
  );
}

function Pill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "warning" | "success";
}) {
  const accentClass =
    accent === "warning"
      ? "text-[var(--color-warning)]"
      : accent === "success"
        ? "text-[var(--color-success)]"
        : "text-foreground";
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-1.5 py-0.5">
      <Mono className="text-[10px] uppercase tracking-[0.06em]">{label}</Mono>
      <span className={`mono text-[12px] font-semibold ${accentClass}`}>
        {value}
      </span>
    </span>
  );
}

interface RecentItem {
  id: string;
  href: string;
  title: string;
  status: string;
  timestamp: string | null;
}

function RecentList({
  items,
  loading,
  emptyLabel,
}: {
  items: RecentItem[];
  loading: boolean;
  emptyLabel: string;
}) {
  if (loading) {
    return (
      <ul className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 py-1.5"
          >
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3.5 w-16" />
          </li>
        ))}
      </ul>
    );
  }
  if (items.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="group flex items-center justify-between gap-3 py-2 text-sm hover:text-copper"
          >
            <span className="truncate font-medium group-hover:underline">
              {item.title}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <StatusBadge status={item.status} />
              {item.timestamp ? (
                <RelativeTime
                  value={item.timestamp}
                  className="text-[11px] text-muted-foreground"
                />
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
