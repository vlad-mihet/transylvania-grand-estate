"use client";

import { useTranslations } from "next-intl";
import {
  type BrandContext,
  useBrandContext,
} from "./brand-context-provider";

interface Option {
  value: BrandContext;
  labelKey: "brandAll" | "brandTge" | "brandRevery";
}

const OPTIONS: readonly Option[] = [
  { value: "all", labelKey: "brandAll" },
  { value: "tge", labelKey: "brandTge" },
  { value: "revery", labelKey: "brandRevery" },
] as const;

interface BrandContextSwitcherProps {
  className?: string;
}

export function BrandContextSwitcher({ className }: BrandContextSwitcherProps) {
  const { active, setActive } = useBrandContext();
  const t = useTranslations("BrandContext");

  return (
    <div
      className={[
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
      aria-label={t("ariaLabel")}
    >
      {OPTIONS.map((opt) => {
        const isActive = opt.value === active;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setActive(opt.value)}
            className={[
              "rounded px-2.5 py-1 text-xs font-semibold tracking-[0.04em] transition-colors",
              isActive
                ? "bg-copper/10 text-copper"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
