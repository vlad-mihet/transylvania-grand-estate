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
  /**
   * Optional secondary submit. Renders an extra primary button to the
   * left of Save (e.g. "Save & next" for the lesson editor). The handler
   * is invoked instead of the regular submit when this button is clicked;
   * the parent form is responsible for routing it through `form.handleSubmit`
   * so validation still applies.
   */
  secondarySubmit?: {
    label: string;
    onClick: () => void;
  };
  /**
   * Opt-in draft + publish dual-action mode. When set, the primary submit
   * (`type="submit"`) saves a draft (the form's regular handler is
   * responsible for sending `mode: "draft"`); the extra Publish button is
   * rendered as a separate primary action that calls `publishAction.onClick`
   * — typically the form routes that callback through `form.handleSubmit`
   * with `mode: "publish"`.
   */
  publishAction?: {
    label: string;
    onClick: () => void;
  };
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
  secondarySubmit,
  publishAction,
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
        {secondarySubmit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={secondarySubmit.onClick}
          >
            {secondarySubmit.label}
          </Button>
        ) : null}
        <Button
          type="submit"
          size="sm"
          variant={publishAction ? "outline" : "default"}
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
        {publishAction ? (
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={publishAction.onClick}
          >
            {publishAction.label}
          </Button>
        ) : null}
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
