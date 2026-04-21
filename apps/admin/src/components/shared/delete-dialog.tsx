"use client";

import { useTranslations } from "next-intl";
import { ConfirmDialog } from "./confirm-dialog";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
}

export function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  loading = false,
}: DeleteDialogProps) {
  const tc = useTranslations("Common");

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={title ?? tc("deleteItem")}
      description={description ?? tc("deleteConfirm")}
      confirmLabel={tc("delete")}
      loadingLabel={tc("deleting")}
      loading={loading}
      tone="destructive"
    />
  );
}
