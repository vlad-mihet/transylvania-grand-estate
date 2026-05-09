import { Mono } from "@/components/shared/mono";
import { cn } from "@tge/utils";

interface AcademyProgressBarProps {
  completed: number;
  total: number;
  className?: string;
  /** Optional: hide the numeric "x / y" suffix (used in dense list rows). */
  hideCount?: boolean;
}

/**
 * Slim two-tone progress indicator for academy course rollups. A muted
 * track with a success-tinted fill, plus a small mono "completed/total"
 * suffix. Empty courses (total = 0) render the bar in a quiet, fully
 * muted state so they read as "no published lessons" rather than "0%
 * progress" — the latter would visually punish course rows the student
 * can't make progress against.
 */
export function AcademyProgressBar({
  completed,
  total,
  className,
  hideCount,
}: AcademyProgressBarProps) {
  const safeTotal = Math.max(0, total);
  const safeCompleted = Math.max(0, Math.min(completed, safeTotal));
  const percent =
    safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100);
  const empty = safeTotal === 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
      >
        {!empty && (
          <div
            className="h-full rounded-full bg-[var(--color-success)] transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
      {!hideCount && (
        <Mono className="shrink-0 text-[10px] text-muted-foreground">
          {safeCompleted}/{safeTotal}
        </Mono>
      )}
    </div>
  );
}
