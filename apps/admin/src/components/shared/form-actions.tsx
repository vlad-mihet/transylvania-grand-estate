"use client";

import { useState } from "react";
import { Button } from "@tge/ui";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ConfirmDialog } from "./confirm-dialog";

interface FormActionsProps {
  /** Where Cancel navigates when the form is pristine (or after the user confirms discard). */
  cancelHref: string;
  /** Submit-button disabled + spinner state. Typically `mutation.isPending`. */
  loading?: boolean;
  /** When true and form is dirty, Cancel opens a discard-changes confirm dialog. */
  dirty?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}

/**
 * Standard form footer: right-aligned Cancel + Save. Cancel routes contextually
 * (never `window.history.back()`) and, if the form is dirty, prompts before
 * discarding. Save shows a spinner + "Saving…" while `loading` is true and is
 * disabled, along with Cancel, to prevent double-submits or mid-mutation nav.
 */
export function FormActions({
  cancelHref,
  loading = false,
  dirty = false,
  submitLabel,
  cancelLabel,
}: FormActionsProps) {
  const tc = useTranslations("Common");
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleCancel = () => {
    if (dirty && !loading) {
      setConfirmOpen(true);
      return;
    }
    router.push(cancelHref);
  };

  const handleConfirmDiscard = () => {
    setConfirmOpen(false);
    router.push(cancelHref);
  };

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={loading}
        >
          {cancelLabel ?? tc("cancel")}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              {tc("saving")}
            </>
          ) : (
            submitLabel ?? tc("save")
          )}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmDiscard}
        title={tc("discardTitle")}
        description={tc("discardDescription")}
        confirmLabel={tc("discard")}
        cancelLabel={tc("keepEditing")}
        tone="destructive"
      />
    </>
  );
}
