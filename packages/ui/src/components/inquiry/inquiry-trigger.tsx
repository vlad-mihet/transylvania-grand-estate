"use client";

import type { ReactNode } from "react";
import { useInquiryModal, type InquiryContext } from "./inquiry-context";

interface InquiryTriggerProps {
  context: InquiryContext;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

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
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      className={`cursor-pointer ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
