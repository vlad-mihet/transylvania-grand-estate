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
import { RecentList } from "@/components/shared/recent-list";
import { LocaleCompletenessPanel } from "./_components/locale-completeness-panel";
import { EnTranslationsQueue } from "./_components/en-translations-queue";

type LocalizedTitle = Record<string, string | undefined>;

interface RecentArticleEntry {
  id: string;
  slug: string;
  title: LocalizedTitle;
  status: "draft" | "published";
  updatedAt: string;
  publishedAt: string | null;
}

interface RecentCourseEntry {
  id: string;
  slug: string;
  title: LocalizedTitle;
  status: "draft" | "published" | "archived";
  updatedAt: string;
}

interface ArticleSummary {
  total: number;
  drafts: number;
  published: number;
  recent: RecentArticleEntry[];
}

interface CourseSummary {
  total: number;
  drafts: number;
  published: number;
  archived: number;
  recent: RecentCourseEntry[];
}

interface ContentSummaryResponse {
  articles: ArticleSummary;
  courses: CourseSummary;
}

export default function ContentOverviewPage() {
  const t = useTranslations("Content");
  const { can } = usePermissions();

  const showArticles = can("article.read");
  const showCourses = can("academy.course.read");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("moduleTitle")}
        description={t("moduleDescription")}
      />

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
              <Link href="/people/students">
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

/**
 * Single shared query against /admin/content/locale-completeness — the same
 * endpoint LocaleCompletenessPanel + EnTranslationsQueue read from. React
 * Query dedupes on the queryKey, so all four consumers (panel, queue, this
 * hook, and the dashboard's missing-EN tile via its own aggregator) reuse
 * one HTTP round-trip per page load.
 */
function useContentSummary() {
  return useQuery({
    queryKey: ["content-locale-completeness"],
    queryFn: () =>
      apiClient<ContentSummaryResponse>(
        "/admin/content/locale-completeness",
      ),
    staleTime: 60_000,
  });
}

function ArticlesOverviewCard() {
  const t = useTranslations("Content");
  const locale = useLocale();
  const query = useContentSummary();

  const summary = query.data?.articles;
  const total = summary?.total ?? 0;
  const drafts = summary?.drafts ?? 0;
  const published = summary?.published ?? 0;
  const recent = summary?.recent ?? [];

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
          loading={query.isLoading}
        />
      </CardHeader>
      <CardContent>
        <RecentList
          items={recent.map((a) => ({
            id: a.id,
            href: `/articles/${a.slug}/edit`,
            title: a.title[locale] ?? a.title.en ?? a.title.ro ?? a.slug,
            status: a.status,
            timestamp: a.updatedAt ?? a.publishedAt ?? null,
          }))}
          loading={query.isLoading}
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
  const query = useContentSummary();

  const summary = query.data?.courses;
  const total = summary?.total ?? 0;
  const drafts = summary?.drafts ?? 0;
  const published = summary?.published ?? 0;
  const archived = summary?.archived ?? 0;
  const recent = summary?.recent ?? [];

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
          loading={query.isLoading}
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
          loading={query.isLoading}
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

// Local RecentList replaced by the shared `<RecentList>` extracted to
// `apps/admin/src/components/shared/recent-list.tsx` so Phase 3 module
// homes (catalog, locations, finance) reuse the same shape.
