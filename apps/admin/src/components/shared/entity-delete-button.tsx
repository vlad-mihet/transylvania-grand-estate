"use client";

import { useState } from "react";
import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Button } from "@tge/ui";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { useRouter } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import type { Action, OwnershipResource } from "@/lib/permissions";

interface EntityDeleteButtonProps {
  /** API path segment, e.g. `/agents/${id}`. Full DELETE target. */
  apiPath: string;
  /** Permission string for the <Can> gate. */
  permission: Action;
  /** Resource for ownership-gated verbs (AGENT role). */
  resource?: OwnershipResource;
  /** Navigation target after a successful delete. Typically the list page. */
  listHref: string;
  /** Query keys to invalidate on success. */
  invalidateKeys: QueryKey[];
  confirmTitle?: string;
  confirmDescription?: string;
  successMessage: string;
  errorMessage: string;
  /** Override the button label. Defaults to the translated "Delete". */
  label?: string;
}

/**
 * Destructive "Delete" action intended for detail / edit page headers.
 * Encapsulates the mutation + confirm dialog so callers only wire resource
 * metadata. Navigates to `listHref` on success and shows a toast either way.
 */
export function EntityDeleteButton({
  apiPath,
  permission,
  resource,
  listHref,
  invalidateKeys,
  confirmTitle,
  confirmDescription,
  successMessage,
  errorMessage,
  label,
}: EntityDeleteButtonProps) {
  const tc = useTranslations("Common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => apiClient(apiPath, { method: "DELETE" }),
    onSuccess: async () => {
      await Promise.all(
        invalidateKeys.map((key) =>
          queryClient.invalidateQueries({ queryKey: key }),
        ),
      );
      toast.success(successMessage);
      setOpen(false);
      router.push(listHref);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : errorMessage),
  });

  return (
    <Can action={permission} resource={resource}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5 sm:mr-1.5" />
        <span className="hidden sm:inline">{label ?? tc("delete")}</span>
      </Button>

      <DeleteDialog
        open={open}
        onOpenChange={setOpen}
        onConfirm={() => mutation.mutate()}
        title={confirmTitle}
        description={confirmDescription}
        loading={mutation.isPending}
      />
    </Can>
  );
}
