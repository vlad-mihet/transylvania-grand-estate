"use client";

import { cn } from "@tge/utils";
import { Check, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ApiBrand } from "@tge/types";

const BRAND_KEYS: readonly ApiBrand[] = ["tge", "revery"] as const;

const BRAND_LABEL: Record<ApiBrand, string> = {
  tge: "TGE",
  revery: "Revery",
};

interface BrandBadgesProps {
  /** Currently tagged brands. */
  brands: readonly ApiBrand[] | undefined;
  /**
   * If provided, renders the badges as toggle buttons. Each click is expected
   * to call back with `next=true` to add or `next=false` to remove the brand.
   */
  onToggle?: (args: { brand: ApiBrand; next: boolean }) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Renders TGE / Revery brand chips. Read-only by default; pass `onToggle`
 * to enable per-brand add/remove from list rows. Untagged brands show as
 * faint outline; tagged brands fill in the brand color (copper for TGE,
 * purple-violet for Revery to match the public-site palette).
 */
export function BrandBadges({
  brands,
  onToggle,
  disabled,
  size = "sm",
  className,
}: BrandBadgesProps) {
  const t = useTranslations("BrandContext");
  const tagged = new Set(brands ?? []);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {BRAND_KEYS.map((brand) => {
        const isOn = tagged.has(brand);
        const Icon = isOn ? Check : Plus;
        const interactive = Boolean(onToggle) && !disabled;
        const label = BRAND_LABEL[brand];
        const ariaLabel = isOn
          ? t("toggleRemove", { brand: label })
          : t("toggleAdd", { brand: label });

        const baseClasses = cn(
          "mono inline-flex items-center gap-0.5 rounded-sm border font-semibold uppercase tracking-[0.08em] transition-colors",
          size === "sm"
            ? "px-1.5 py-0.5 text-[10px]"
            : "px-2 py-1 text-[11px]",
          isOn
            ? brand === "tge"
              ? "border-copper/30 bg-copper/10 text-copper"
              : "border-[color-mix(in_srgb,#7c3aed_30%,transparent)] bg-[color-mix(in_srgb,#7c3aed_10%,transparent)] text-[#7c3aed]"
            : "border-border bg-card text-muted-foreground",
          interactive
            ? "cursor-pointer hover:border-foreground/30 hover:text-foreground"
            : "",
          disabled ? "cursor-not-allowed opacity-60" : "",
        );

        if (!interactive) {
          // Non-interactive: render only tagged brands so detail views stay
          // visually quiet. Toggle mode renders both states for the affordance.
          if (!isOn) return null;
          return (
            <span key={brand} className={baseClasses}>
              <Icon className="h-2.5 w-2.5" />
              {label}
            </span>
          );
        }

        return (
          <button
            key={brand}
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-pressed={isOn}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggle?.({ brand, next: !isOn });
            }}
            className={baseClasses}
          >
            <Icon className="h-2.5 w-2.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
