"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { inviteAcademyUserSchema } from "@tge/types";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { useApiFormErrors } from "@tge/hooks";
import { pickTitle } from "@/lib/academy/pick-title";

type Course = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
};

type InviteResponse = {
  id: string;
  email: string;
  emailDelivered: boolean;
  devAcceptUrl?: string;
};

const WILDCARD = "__wildcard__";
const LOCALES = ["ro", "en", "fr", "de"] as const;

/**
 * Form-side schema — extends the shared server-side schema with a sentinel
 * `__wildcard__` value for the course select so react-hook-form can register
 * a single string field. Transformed to `null` before submit.
 */
const formSchema = inviteAcademyUserSchema
  .pick({ email: true, name: true, locale: true })
  .extend({
    initialCourseId: z.string().min(1),
  });

type FormValues = z.infer<typeof formSchema>;

interface InviteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  onSuccess: () => void;
}

export function InviteStudentDialog({
  open,
  onOpenChange,
  courses,
  onSuccess,
}: InviteStudentDialogProps) {
  const locale = useLocale();
  const t = useTranslations("Academy.invite");
  const tLang = useTranslations("Academy.languages");
  const tt = useTranslations("Academy.toasts");
  const tc = useTranslations("Common");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      locale: "ro",
      initialCourseId: WILDCARD,
    },
  });

  // Reset form when the dialog reopens so stale values don't leak from
  // a previous successful send.
  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (input: {
      email: string;
      name: string;
      locale: "ro" | "en" | "fr" | "de";
      initialCourseId: string | null;
    }) =>
      apiClient<InviteResponse>("/admin/academy/invitations", {
        method: "POST",
        body: input,
      }),
    onSuccess: (res) => {
      if (res.devAcceptUrl) {
        toast.success({
          title: tt("invitationDevMode"),
          description: tt("invitationDevModeDescription", {
            url: res.devAcceptUrl,
          }),
        });
      } else if (res.emailDelivered) {
        toast.success(tt("invitationSent"));
      } else {
        toast.warning(tt("invitationEmailFailed"));
      }
      onSuccess();
    },
  });

  useApiFormErrors(form, mutation.error, (err) => {
    toast.error(err instanceof ApiError ? err.message : tt("invitationSendFailed"));
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate({
      email: values.email,
      name: values.name,
      locale: values.locale ?? "ro",
      initialCourseId:
        values.initialCourseId === WILDCARD ? null : values.initialCourseId,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="invite-email">{t("emailLabel")}</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              placeholder={t("emailPlaceholder")}
              {...form.register("email")}
              className="mono mt-1.5"
            />
            {form.formState.errors.email ? (
              <p className="mt-1 text-xs text-[var(--color-danger)]">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="invite-name">{t("nameLabel")}</Label>
            <Input
              id="invite-name"
              placeholder={t("namePlaceholder")}
              {...form.register("name")}
              className="mt-1.5"
            />
            {form.formState.errors.name ? (
              <p className="mt-1 text-xs text-[var(--color-danger)]">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="invite-course">{t("courseLabel")}</Label>
            <Select
              value={form.watch("initialCourseId")}
              onValueChange={(v) =>
                form.setValue("initialCourseId", v, { shouldDirty: true })
              }
            >
              <SelectTrigger id="invite-course" className="mt-1.5">
                <SelectValue placeholder={t("coursePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={WILDCARD}>{t("wildcardOption")}</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {pickTitle(c.title, c.slug, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="invite-locale">{t("localeLabel")}</Label>
            <Select
              value={form.watch("locale") ?? "ro"}
              onValueChange={(v) =>
                form.setValue("locale", v as FormValues["locale"], {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="invite-locale" className="mt-1.5">
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

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
