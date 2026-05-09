import { Mono } from "@/components/shared/mono";
import { cn } from "@tge/utils";
import type { ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: string | number | ReactNode;
  caption?: ReactNode;
  className?: string;
  /** Optional emphasis tone — keeps tiles muted by default. */
  tone?: "default" | "success" | "warning";
}

/**
 * Lightweight numeric tile for admin section cards. Renders a small
 * uppercase label, a bold numeric value, and an optional caption line.
 * Wraps the value in a fixed-height row so a grid of four tiles aligns
 * even when one of them shows "—" or a longer "1,234 students".
 */
export function StatTile({
  label,
  value,
  caption,
  className,
  tone = "default",
}: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-background px-4 py-3",
        className,
      )}
    >
      <div className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 flex h-7 items-end text-xl font-semibold leading-none",
          tone === "success" && "text-[var(--color-success)]",
          tone === "warning" && "text-[var(--color-warning)]",
        )}
      >
        {typeof value === "number" || typeof value === "string" ? (
          <Mono className="text-xl font-semibold">{value}</Mono>
        ) : (
          value
        )}
      </div>
      {caption && (
        <div className="mt-1 text-[11px] text-muted-foreground">
          {caption}
        </div>
      )}
    </div>
  );
}
