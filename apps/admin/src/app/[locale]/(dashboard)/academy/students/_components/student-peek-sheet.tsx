"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@tge/ui";
import { ExternalLink, X } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { Link } from "@/i18n/navigation";
import { Mono, MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DetailSheet,
  DetailSheetSection,
} from "@/components/shared/detail-sheet";
import { pickTitle, WILDCARD_COURSE_VALUE } from "@/modules/academy";
import { flags } from "@/lib/flags";

type Enrollment = {
  id: string;
  courseId: string | null;
  enrolledAt: string;
  revokedAt?: string | null;
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

type Student = {
  id: string;
  email: string;
  name: string;
  locale: string | null;
  emailVerifiedAt: string | null;
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
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED" | "BOUNCED";
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

interface StudentPeekSheetProps {
  studentId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function StudentPeekSheet({
  studentId,
  onOpenChange,
}: StudentPeekSheetProps) {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const t = useTranslations("Academy.students");
  const tPeek = useTranslations("Academy.students.peek");
  const tt = useTranslations("Academy.toasts");

  const open = !!studentId;

  const studentQuery = useQuery({
    enabled: open,
    queryKey: ["academy-student", studentId],
    queryFn: () => apiClient<Student>(`/admin/academy/users/${studentId}`),
  });

  const coursesQuery = useQuery({
    enabled: open,
    queryKey: ["academy-courses-brief"],
    queryFn: () =>
      apiClient<{ data: Course[] }>("/admin/academy/courses?limit=100", {
        envelope: true,
      }),
  });

  const latestInvitationQuery = useQuery({
    enabled: open && !!studentQuery.data?.email,
    queryKey: ["academy-invitations-for", studentQuery.data?.email],
    queryFn: () =>
      apiClient<{ data: Invitation[] }>(
        `/admin/academy/invitations?email=${encodeURIComponent(studentQuery.data!.email)}&limit=5`,
        { envelope: true },
      ),
  });

  const [grantCourseId, setGrantCourseId] = useState<string>("");

  const invalidateStudent = () => {
    queryClient.invalidateQueries({ queryKey: ["academy-student", studentId] });
    queryClient.invalidateQueries({ queryKey: ["academy-students"] });
  };

  const grantMutation = useMutation({
    mutationFn: (courseId: string | null) =>
      apiClient<Enrollment>("/admin/academy/enrollments", {
        method: "POST",
        body: { userId: studentId, courseId },
      }),
    onSuccess: () => {
      invalidateStudent();
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
      invalidateStudent();
      toast.success(tt("accessRevoked"));
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : tt("accessRevokeFailed"),
      ),
  });

  const student = studentQuery.data;
  const activeEnrollments = useMemo(
    () =>
      student
        ? student.enrollments.filter((e) => e.revokedAt === null)
        : [],
    [student],
  );
  const enrolledCourseIds = useMemo(
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
    return all.filter((c) => !enrolledCourseIds.has(c.id));
  }, [coursesQuery.data, enrolledCourseIds]);

  const latestInvitation = latestInvitationQuery.data?.data[0];

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={student?.name ?? tPeek("loading")}
      subtitle={
        student ? (
          <Mono className="text-muted-foreground">{student.email}</Mono>
        ) : null
      }
      status={
        student && !flags.emailVerificationDisabled ? (
          <StatusBadge
            status={student.emailVerifiedAt ? "verified" : "unverified"}
            tone={student.emailVerifiedAt ? "success" : "warning"}
          />
        ) : null
      }
      footer={
        student ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/academy/students/${student.id}`}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              {tPeek("openFullProfile")}
            </Link>
          </Button>
        ) : null
      }
    >
      {studentQuery.isLoading ? (
        <div className="space-y-4 py-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !student ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {tPeek("notFound")}
        </p>
      ) : (
        <>
          <DetailSheetSection label={tPeek("activitySection")}>
            <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">{tPeek("lastLogin")}</dt>
              <dd>
                {student.lastLoginAt ? (
                  <RelativeTime value={student.lastLoginAt} />
                ) : (
                  <span className="text-muted-foreground">
                    {t("lastLoginNever")}
                  </span>
                )}
              </dd>
              <dt className="text-muted-foreground">{tPeek("joined")}</dt>
              <dd>
                <RelativeTime value={student.createdAt} />
              </dd>
              <dt className="text-muted-foreground">{tPeek("locale")}</dt>
              <dd>
                <MonoTag>{student.locale ?? "—"}</MonoTag>
              </dd>
            </dl>
          </DetailSheetSection>

          <DetailSheetSection
            label={tPeek("enrollmentsSection", {
              count: activeEnrollments.length,
            })}
          >
            {hasWildcard ? (
              <p className="mb-2 rounded-md border border-[color-mix(in_srgb,var(--color-warning)_25%,var(--border))] bg-[var(--color-warning-bg)] px-2.5 py-1.5 text-[11px] text-[var(--color-warning)]">
                {t("enrollmentsWildcardWarning")}
              </p>
            ) : null}

            {activeEnrollments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("enrollmentsEmpty")}
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {activeEnrollments.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {e.course
                          ? pickTitle(e.course.title, e.course.slug, locale)
                          : t("enrollmentsWildcardLabel")}
                      </p>
                      <Mono className="block text-[11px] text-muted-foreground">
                        <RelativeTime value={e.enrolledAt} />
                      </Mono>
                    </div>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                      onClick={() => revokeMutation.mutate(e.id)}
                      disabled={revokeMutation.isPending}
                      aria-label={t("enrollmentsRevoke")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="peek-grant-course" className="text-[11px]">
                  {t("enrollmentsGrantLabel")}
                </Label>
                <Select
                  value={grantCourseId}
                  onValueChange={setGrantCourseId}
                  disabled={hasWildcard}
                >
                  <SelectTrigger
                    id="peek-grant-course"
                    className="mt-1 h-8 text-sm"
                  >
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
          </DetailSheetSection>

          {latestInvitation ? (
            <DetailSheetSection label={tPeek("latestInvitationSection")}>
              <div className="flex items-center justify-between text-xs">
                <StatusBadge status={latestInvitation.status.toLowerCase()} />
                <RelativeTime value={latestInvitation.createdAt} />
              </div>
            </DetailSheetSection>
          ) : null}

          {student.identities.length > 0 ? (
            <DetailSheetSection label={tPeek("identitiesSection")}>
              <ul className="flex flex-wrap gap-1.5">
                {student.identities.map((id) => (
                  <li key={id.id}>
                    <MonoTag>
                      {id.provider}
                      {id.emailVerified ? " ✓" : ""}
                    </MonoTag>
                  </li>
                ))}
              </ul>
            </DetailSheetSection>
          ) : null}
        </>
      )}
    </DetailSheet>
  );
}
