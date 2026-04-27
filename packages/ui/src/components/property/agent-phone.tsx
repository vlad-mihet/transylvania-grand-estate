"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { cn } from "@tge/utils";

export type AgentPhoneVariant = "reveria" | "landing";

export interface AgentPhoneProps {
  /** Agent's phone number (E.164 or local). Masked until the user reveals. */
  phone: string;
  /** Translated CTA shown next to the masked number, e.g. "View phone". */
  revealLabel: string;
  /** Skip the leading phone icon — caller renders its own affordance. */
  hideIcon?: boolean;
  /** Visual variant — controls token palette for cross-brand styling. */
  variant?: AgentPhoneVariant;
  className?: string;
}

export function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return "••• ••• •••";
  return `${trimmed.slice(0, 4)} ••• •••`;
}

const VARIANT_CLASSES: Record<
  AgentPhoneVariant,
  {
    iconWrap: string;
    icon: string;
    number: string;
    cta: string;
    revealedLink: string;
  }
> = {
  reveria: {
    iconWrap:
      "w-9 h-9 rounded-full border border-border flex items-center justify-center shrink-0",
    icon: "h-4 w-4 text-primary",
    number: "text-foreground font-semibold tracking-wide",
    cta: "text-xs text-primary hover:underline",
    revealedLink:
      "text-foreground font-semibold tracking-wide hover:text-primary transition-colors",
  },
  landing: {
    iconWrap:
      "w-9 h-9 rounded-full border border-copper/30 flex items-center justify-center shrink-0",
    icon: "h-4 w-4 text-copper",
    number: "text-cream font-medium tracking-wide",
    cta: "text-xs text-copper hover:underline",
    revealedLink:
      "text-cream font-medium tracking-wide hover:text-copper transition-colors",
  },
};

export function AgentPhone({
  phone,
  revealLabel,
  hideIcon,
  variant = "reveria",
  className,
}: AgentPhoneProps) {
  const [revealed, setRevealed] = useState(false);
  const v = VARIANT_CLASSES[variant];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {!hideIcon && (
        <span className={v.iconWrap}>
          <Phone className={v.icon} />
        </span>
      )}
      {revealed ? (
        <a href={`tel:${phone}`} className={v.revealedLink}>
          {phone}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="flex flex-col items-start text-left"
        >
          <span className={v.number}>{maskPhone(phone)}</span>
          <span className={v.cta}>{revealLabel}</span>
        </button>
      )}
    </div>
  );
}
