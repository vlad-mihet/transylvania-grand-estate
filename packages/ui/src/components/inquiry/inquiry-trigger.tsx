"use client";

import type { ReactNode } from "react";
import { Slot } from "radix-ui";
import { useInquiryModal, type InquiryContext } from "./inquiry-context";

interface InquiryTriggerProps {
  context: InquiryContext;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Wraps a single interactive child (typically `<Button>` or `<AccentButton>`)
 * and merges the inquiry-open click handler into it via Radix `Slot`. Using
 * Slot avoids the previous `<div role="button">` wrapper, which produced
 * nested-interactive ARIA violations when the child was already a real
 * `<button>`. The child element keeps its own role, focus order, and
 * disabled state — InquiryTrigger only adds the click side-effect.
 */
export function InquiryTrigger({
  context,
  children,
  className,
  onClick,
}: InquiryTriggerProps) {
  const { openInquiry } = useInquiryModal();

  const handleClick = () => {
    onClick?.();
    openInquiry(context);
  };

  return (
    <Slot.Root onClick={handleClick} className={className}>
      {children}
    </Slot.Root>
  );
}
