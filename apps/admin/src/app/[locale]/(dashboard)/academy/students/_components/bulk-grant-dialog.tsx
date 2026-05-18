"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { pickTitle, WILDCARD_COURSE_VALUE } from "@/modules/academy";

type Course = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
};

type BulkResult = {
  granted: number;
  alreadyEnrolled: number;
  invited: number;
  skipped: Array<{ email?: string; userId?: string; reason: string }>;
};

interface BulkGrantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userIds: string[];
  courses: Course[];
  onSuccess: () => void;
}

/**
 * Dialog driven by the students-list bulk-action button. Admin picks a
 * course (or the wildcard), submits, and we fan the bulk-grant call out
 * with the pre-selected userIds. The result envelope is summarised in
 * a toast — full per-row breakdown lives in the API response and can
 * be surfaced in a future "import history" panel.
 */
export function BulkGrantDialog({
  open,
  onOpenChange,
  userIds,
  courses,
  onSuccess,
}: BulkGrantDialogProps) {
  const locale = useLocale();
  const t = useTranslations("Academy.bulkGrant");
  const tc = useTranslations("Common");
  const [courseId, setCourseId] = useState<string>("");

  const mutation = useMutation({
    mutationFn: () =>
      apiClient<BulkResult>("/admin/academy/enrollments/bulk", {
        method: "POST",
        body: {
          courseId:
            courseId === WILDCARD_COURSE_VALUE || courseId === ""
              ? null
              : courseId,
          userIds,
        },
      }),
    onSuccess: (result) => {
      toast.success(
        t("toastSummary", {
          granted: result.granted,
          alreadyEnrolled: result.alreadyEnrolled,
          skipped: result.skipped.length,
        }),
      );
      setCourseId("");
      onSuccess();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.message : t("toastFailed"),
      ),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("title", { count: userIds.length })}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="bulk-grant-course">{t("courseLabel")}</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger id="bulk-grant-course" className="mt-1.5">
                <SelectValue placeholder={t("coursePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={WILDCARD_COURSE_VALUE}>
                  {t("wildcardOption")}
                </SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {pickTitle(c.title, c.slug, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!courseId || mutation.isPending}
          >
            {mutation.isPending
              ? t("submitting")
              : t("submit", { count: userIds.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
