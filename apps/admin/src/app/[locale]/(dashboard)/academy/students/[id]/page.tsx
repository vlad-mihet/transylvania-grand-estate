"use client";

import { useParams, useRouter, notFound } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { Trash2 } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";
import { SectionCard } from "@/components/shared/section-card";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { Mono } from "@/components/shared/mono";
import { PageHeader } from "@/components/shared/page-header";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingState } from "@/components/shared/states";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { pickTitle, WILDCARD_COURSE_VALUE } from "@/lib/academy/pick-title";

type Enrollment = {
  id: string;
  userId: string;
  courseId: string | null;
  grantedById: string;
  enrolledAt: string;
  revokedAt: string | null;
  course: {
    id: string;
    slug: string;
    title: Record<string, string | undefined>;
  } | null;
};

type Identity = {
  id: string;
  provider: string;
  email: string;
  emailVerified: boolean;
};

type StudentLocale = "ro" | "en" | "fr" | "de";

type Student = {
  id: string;
  email: string;
  name: string;
  locale: StudentLocale | null;
  lastLoginAt: string | null;
  createdAt: string;
  enrollments: Enrollment[];
  identities: Identity[];
};

type Course = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
};

type Invitation = {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED" | "BOUNCED";
  expiresAt: string;
  acceptedAt: string | null;
  acceptedVia: string | null;
  createdAt: string;
  initialCourse: {
    id: string;
    slug: string;
    title: Record<string, string | undefined>;
  } | null;
};

const LOCALES: StudentLocale[] = ["ro", "en", "fr", "de"];

export default function AcademyStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Academy.students");
  const tLang = useTranslations("Academy.languages");
  const tc = useTranslations("Common");
  const tt = useTranslations("Academy.toasts");

  const studentQuery = useQuery({
    queryKey: ["academy-student", params.id],
    queryFn: () => apiClient<Student>(`/admin/academy/users/${params.id}`),
  });

  const coursesQuery = useQuery({
    queryKey: ["academy-courses-brief"],
    queryFn: () =>
      apiClient<{ data: Course[] }>("/admin/academy/courses?limit=100", {
        envelope: true,
      }),
  });

  const invitationsQuery = useQuery({
    enabled: !!studentQuery.data?.email,
    queryKey: ["academy-invitations-for", studentQuery.data?.email],
    queryFn: () =>
      apiClient<{ data: Invitation[] }>(
        `/admin/academy/invitations?email=${encodeURIComponent(studentQuery.data!.email)}&limit=20`,
        { envelope: true },
      ),
  });

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [localeDraft, setLocaleDraft] = useState<StudentLocale | undefined>(
    undefined,
  );
  const profileDirty =
    (nameDraft !== null &&
      nameDraft !== (studentQuery.data?.name ?? "")) ||
    (localeDraft !== undefined &&
      localeDraft !== (studentQuery.data?.locale ?? null));

  const updateMutation = useMutation({
    mutationFn: (body: { name?: string; locale?: string | null }) =>
      apiClient<Student>(`/admin/academy/users/${params.id}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["academy-student", params.id],
      });
      queryClient.invalidateQueries({ queryKey: ["academy-students"] });
      toast.success(tt("studentUpdated"));
      setNameDraft(null);
      setLocaleDraft(undefined);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : tt("studentUpdateFailed"),
      ),
  });

  useUnsavedChangesWarning(profileDirty && !updateMutation.isPending);

  const [grantCourseId, setGrantCourseId] = useState<string>("");
  const grantMutation = useMutation({
    mutationFn: (courseId: string | null) =>
      apiClient<Enrollment>("/admin/academy/enrollments", {
        method: "POST",
        body: { userId: params.id, courseId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["academy-student", params.id],
      });
      toast.success(tt("accessGranted"));
      setGrantCourseId("");
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : tt("accessGrantFailed"),
      ),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/admin/academy/enrollments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["academy-student", params.id],
      });
      toast.success(tt("accessRevoked"));
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : tt("accessRevokeFailed"),
      ),
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: () =>
      apiClient(`/admin/academy/users/${params.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(tt("studentDeleted"));
      router.push(`/${locale}/academy/students`);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : tt("studentDeleteFailed"),
      ),
  });

  const student = studentQuery.data;
  const activeEnrollments = useMemo(
    () =>
      student ? student.enrollments.filter((e) => e.revokedAt === null) : [],
    [student],
  );
  const alreadyEnrolledCourseIds = useMemo(
    () =>
      new Set(
        activeEnrollments
          .map((e) => e.courseId)
          .filter((id): id is string => !!id),
      ),
    [activeEnrollments],
  );
  const hasWildcard = activeEnrollments.some((e) => e.courseId === null);
  const grantableCourses = useMemo(() => {
    const all = coursesQuery.data?.data ?? [];
    return all.filter((c) => !alreadyEnrolledCourseIds.has(c.id));
  }, [coursesQuery.data, alreadyEnrolledCourseIds]);

  if (studentQuery.isLoading) {
    return <LoadingState label={tc("loading")} />;
  }
  if (studentQuery.isError) {
    const err = studentQuery.error;
    if (err instanceof ApiError && err.status === 404) notFound();
  }
  if (!student) notFound();

  const name = nameDraft ?? student.name;
  const effectiveLocale: StudentLocale =
    localeDraft ?? student.locale ?? "ro";

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.name}
        description={
          student.lastLoginAt
            ? t("detailLastLoginRecent", {
                date: new Date(student.lastLoginAt).toLocaleDateString(locale),
              })
            : t("detailLastLoginNever")
        }
        breadcrumb={
          <Link
            href="/academy/students"
            className="hover:text-foreground hover:underline"
          >
            {t("detailBackToList")}
          </Link>
        }
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <p className="-mt-3 text-xs">
          <Mono className="text-muted-foreground">{student.email}</Mono>
        </p>

        <SectionCard title={t("profileTitle")}>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="student-name">{t("profileNameLabel")}</Label>
              <Input
                id="student-name"
                value={name}
                onChange={(e) => setNameDraft(e.target.value)}
                className="mt-1.5 sm:max-w-sm"
              />
            </div>
            <div>
              <Label htmlFor="student-locale">{t("profileLocaleLabel")}</Label>
              <Select
                value={effectiveLocale}
                onValueChange={(v) => setLocaleDraft(v as StudentLocale)}
              >
                <SelectTrigger
                  id="student-locale"
                  className="mt-1.5 sm:max-w-[220px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {tLang(l)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button
                size="sm"
                disabled={!profileDirty || updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    name: nameDraft ?? undefined,
                    locale: localeDraft ?? undefined,
                  })
                }
              >
                {updateMutation.isPending
                  ? t("profileSaving")
                  : t("profileSave")}
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t("enrollmentsTitle")}
          description={t("enrollmentsDescription")}
        >
          {hasWildcard ? (
            <p className="mb-3 rounded-md border border-[color-mix(in_srgb,var(--color-warning)_25%,var(--border))] bg-[var(--color-warning-bg)] px-3 py-2 text-xs text-[var(--color-warning)]">
              {t("enrollmentsWildcardWarning")}
            </p>
          ) : null}

          {activeEnrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("enrollmentsEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {activeEnrollments.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {e.course
                        ? pickTitle(e.course.title, e.course.slug, locale)
                        : t("enrollmentsWildcardLabel")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("enrollmentsEnrolledOn", {
                        date: new Date(e.enrolledAt).toLocaleDateString(locale),
                      })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[var(--color-danger)]"
                    onClick={() => revokeMutation.mutate(e.id)}
                    disabled={revokeMutation.isPending}
                  >
                    {t("enrollmentsRevoke")}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="grant-course">{t("enrollmentsGrantLabel")}</Label>
              <Select
                value={grantCourseId}
                onValueChange={setGrantCourseId}
                disabled={hasWildcard}
              >
                <SelectTrigger id="grant-course" className="mt-1.5">
                  <SelectValue
                    placeholder={
                      hasWildcard
                        ? t("enrollmentsGrantWildcardPlaceholder")
                        : t("enrollmentsGrantPlaceholder")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WILDCARD_COURSE_VALUE}>
                    {t("enrollmentsWildcardLabel")}
                  </SelectItem>
                  {grantableCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {pickTitle(c.title, c.slug, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              disabled={
                !grantCourseId || hasWildcard || grantMutation.isPending
              }
              onClick={() =>
                grantMutation.mutate(
                  grantCourseId === WILDCARD_COURSE_VALUE
                    ? null
                    : grantCourseId,
                )
              }
            >
              {grantMutation.isPending
                ? t("enrollmentsGranting")
                : t("enrollmentsGrant")}
            </Button>
          </div>
        </SectionCard>

        {student.identities.length > 0 ? (
          <SectionCard title={t("identitiesTitle")}>
            <ul className="flex flex-wrap gap-2">
              {student.identities.map((id) => (
                <li
                  key={id.id}
                  className="rounded-full border border-border px-3 py-1 text-xs"
                >
                  <Mono className="text-muted-foreground">{id.provider}</Mono>
                  {" · "}
                  <span>{id.email}</span>
                  {id.emailVerified ? " ✓" : ""}
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        <SectionCard
          title={t("invitationsTitle")}
          description={t("invitationsDescription")}
        >
          {invitationsQuery.isLoading ? (
            <LoadingState label={tc("loading")} />
          ) : !invitationsQuery.data?.data.length ? (
            <p className="text-sm text-muted-foreground">
              {t("invitationsEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {invitationsQuery.data.data.map((inv) => (
                <li key={inv.id} className="px-4 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={inv.status.toLowerCase()} />
                    <RelativeTime value={inv.createdAt} />
                  </div>
                  {inv.initialCourse ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pickTitle(
                        inv.initialCourse.title,
                        inv.initialCourse.slug,
                        locale,
                      )}
                    </p>
                  ) : null}
                  {inv.acceptedVia ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("invitationsAcceptedVia", { method: inv.acceptedVia })}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <Can action="academy.user.manage">
          <SectionCard title={t("dangerTitle")}>
            <p className="text-sm text-muted-foreground">
              {t("dangerDescription")}
            </p>
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                className="text-[var(--color-danger)]"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                {t("dangerDelete")}
              </Button>
            </div>
          </SectionCard>
        </Can>
      </div>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => deleteMutation.mutate()}
        title={t("dangerDeleteTitle", { name: student.name })}
        description={t("dangerDeleteDescription")}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
