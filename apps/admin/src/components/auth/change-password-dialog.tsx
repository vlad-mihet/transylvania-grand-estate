"use client";

import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
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
} from "@tge/ui";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

/**
 * Mirrors `changePasswordSchema` in `packages/types/src/schemas/auth.ts`
 * plus a client-side confirmation field. Centralising the policy in one
 * schema is only worth it if both sides consume it — this form is small
 * enough that duplicating is cheaper than the shared-package cycle.
 */
const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(12, "Minimum 12 characters")
      .refine((v) => /[a-z]/.test(v), "Needs a lowercase letter")
      .refine((v) => /[A-Z]/.test(v), "Needs an uppercase letter")
      .refine((v) => /\d/.test(v), "Needs a digit"),
    confirm: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const t = useTranslations("ChangePassword");
  const tc = useTranslations("Common");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiClient("/auth/change-password", {
        method: "POST",
        body: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      }),
    onSuccess: () => {
      toast.success(t("success"));
      form.reset();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("failed"));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="grid gap-3"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="current-password">{t("current")}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              {...form.register("currentPassword")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-password">{t("new")}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...form.register("newPassword")}
            />
            {form.formState.errors.newPassword ? (
              <p className="text-[11px] text-[var(--color-danger)]">
                {form.formState.errors.newPassword.message}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">{t("hint")}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-password">{t("confirm")}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              {...form.register("confirm")}
            />
            {form.formState.errors.confirm && (
              <p className="text-[11px] text-[var(--color-danger)]">
                {form.formState.errors.confirm.message}
              </p>
            )}
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  {tc("saving")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
