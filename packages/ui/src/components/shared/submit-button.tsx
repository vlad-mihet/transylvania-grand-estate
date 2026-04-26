"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type buttonVariants } from "../ui/button";
import type { VariantProps } from "class-variance-authority";

type SubmitButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    loadingLabel?: React.ReactNode;
  };

/**
 * Button + pending state. While `loading`, disables the button, shows a
 * spinner, and optionally swaps the label for `loadingLabel`. Used by every
 * form submit across the apps so the pattern is one place, not seven.
 */
export function SubmitButton({
  loading = false,
  loadingLabel,
  disabled,
  children,
  ...props
}: SubmitButtonProps) {
  return (
    <Button {...props} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
