"use client";

import { type LucideIcon } from "lucide-react";
import { Card } from "@tge/ui";
import { cn } from "@tge/utils";

interface CalculatorResultCardProps {
  label: string;
  value: string;
  subtitle?: string;
  variant?: "default" | "highlight" | "success" | "warning" | "danger";
  icon?: LucideIcon;
  className?: string;
}

const variantStyles = {
  default: "border-border",
  highlight: "border-primary/30 bg-primary/5",
  success: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  danger: "border-red-500/30 bg-red-500/5",
};

const variantValueStyles = {
  default: "text-foreground",
  highlight: "text-primary",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-red-600",
};

export function CalculatorResultCard({
  label,
  value,
  subtitle,
  variant = "default",
  icon: Icon,
  className,
}: CalculatorResultCardProps) {
  return (
    <Card
      className={cn(
        "p-4 border transition-colors",
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              variant === "highlight"
                ? "bg-primary/10 text-primary"
                : variant === "success"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : variant === "warning"
                    ? "bg-amber-500/10 text-amber-600"
                    : variant === "danger"
                      ? "bg-red-500/10 text-red-600"
                      : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={cn(
              "text-2xl font-bold tracking-tight",
              variantValueStyles[variant],
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
