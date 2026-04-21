import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@tge/utils";

interface SectionCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  headerActions?: ReactNode;
}

/**
 * Workbench container for a labeled block inside a form or detail page.
 * Thin border, flat background, quiet section header.
 */
export function SectionCard({
  title,
  description,
  headerActions,
  children,
  className,
  ...props
}: SectionCardProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-md border border-border bg-card",
        className,
      )}
    >
      {(title || description || headerActions) && (
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
