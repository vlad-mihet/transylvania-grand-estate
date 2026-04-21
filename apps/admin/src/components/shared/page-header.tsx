"use client";

import type { ReactNode } from "react";
import { Button } from "@tge/ui";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Breadcrumb trail rendered above the title. */
  breadcrumb?: ReactNode;
  /** Primary action — typically a "Create" button linking to a `new` route. */
  createHref?: string;
  createLabel?: string;
  /** Arbitrary extra actions rendered to the right of the primary action. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  createHref,
  createLabel,
  actions,
  className,
}: PageHeaderProps) {
  const t = useTranslations("Common");

  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4",
        className,
      )}
    >
      <div className="min-w-0">
        {breadcrumb && (
          <div className="mb-1.5 text-xs text-muted-foreground">
            {breadcrumb}
          </div>
        )}
        <h1 className="truncate text-[1.375rem] font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {createHref && (
          <Button asChild size="sm">
            <Link href={createHref}>
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">
                {createLabel ?? t("createNew")}
              </span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
