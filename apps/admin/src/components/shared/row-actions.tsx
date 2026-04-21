"use client";

import type { ReactNode } from "react";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@tge/ui";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";
import type { Action, OwnershipResource } from "@/lib/permissions";

interface RowActionsProps {
  viewHref?: string;
  editHref?: string;
  onDelete?: () => void;
  /** Optional permission gates per action. Omit to render without a Can wrap. */
  permissions?: {
    view?: Action;
    edit?: Action;
    delete?: Action;
  };
  /** Resource for ownership-gated verbs (AGENT role on property/inquiry). */
  resource?: OwnershipResource;
  /** Extra action slots rendered to the left of view/edit/delete (e.g. Send invite). */
  extra?: ReactNode;
}

/**
 * Standardised right-aligned icon buttons for a table row: View / Edit / Delete
 * plus an optional `extra` slot for entity-specific actions. Each button is a
 * `ghost` / `icon-xs` Button with a Tooltip for the label so icon-only rows
 * stay keyboard- and screen-reader-accessible. `onClick` stops propagation so a
 * row-level link on the parent <tr> keeps working.
 */
export function RowActions({
  viewHref,
  editHref,
  onDelete,
  permissions,
  resource,
  extra,
}: RowActionsProps) {
  const tc = useTranslations("Common");

  return (
    <div
      className="flex justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {extra}

      {viewHref && (
        <GatedAction action={permissions?.view} resource={resource}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" asChild>
                <Link href={viewHref} aria-label={tc("view")}>
                  <Eye />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tc("view")}</TooltipContent>
          </Tooltip>
        </GatedAction>
      )}

      {editHref && (
        <GatedAction action={permissions?.edit} resource={resource}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" asChild>
                <Link href={editHref} aria-label={tc("edit")}>
                  <Pencil />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tc("edit")}</TooltipContent>
          </Tooltip>
        </GatedAction>
      )}

      {onDelete && (
        <GatedAction action={permissions?.delete} resource={resource}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDelete}
                aria-label={tc("delete")}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tc("delete")}</TooltipContent>
          </Tooltip>
        </GatedAction>
      )}
    </div>
  );
}

function GatedAction({
  action,
  resource,
  children,
}: {
  action?: Action;
  resource?: OwnershipResource;
  children: ReactNode;
}) {
  if (!action) return <>{children}</>;
  return (
    <Can action={action} resource={resource}>
      {children}
    </Can>
  );
}
