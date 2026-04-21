"use client";

import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@tge/utils";

interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  className?: string;
}

/**
 * Mono small-caps label for compact form fields (inline inputs, settings
 * pairs). Replaces the `mono text-[10px] uppercase tracking-[0.08em]
 * text-muted-foreground` block that was repeating across the admin.
 */
export function FieldLabel({ children, className, ...props }: FieldLabelProps) {
  return (
    <label
      className={cn(
        "mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
