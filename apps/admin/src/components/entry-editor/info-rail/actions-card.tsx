"use client";

import { type ComponentType, type ReactNode } from "react";
import { InfoCard } from "./info-card";

export interface InfoRailAction {
  /** Visible button label. */
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string;
  /** Renders the row in destructive red. */
  destructive?: boolean;
  /** Disable the row (e.g. while loading). */
  disabled?: boolean;
  /** Optional secondary label rendered right-aligned (e.g. shortcut). */
  hint?: ReactNode;
}

export interface ActionsCardProps {
  title?: string;
  actions: InfoRailAction[];
}

/**
 * Stack of secondary actions for an entry — Duplicate / Archive / Delete /
 * external links / etc. Primary Save & Publish live in the sticky header,
 * not here. Keep this list short; if it grows past ~5 items, group them.
 */
export function ActionsCard({ title = "Actions", actions }: ActionsCardProps) {
  if (actions.length === 0) return null;
  return (
    <InfoCard title={title}>
      <ul className="-mx-1 space-y-0.5">
        {actions.map((action, i) => (
          <li key={`${action.label}-${i}`}>
            <ActionRow {...action} />
          </li>
        ))}
      </ul>
    </InfoCard>
  );
}

function ActionRow({
  label,
  icon: Icon,
  onClick,
  href,
  destructive,
  disabled,
  hint,
}: InfoRailAction) {
  const className = [
    "flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left text-[12px] transition-colors",
    destructive
      ? "text-destructive hover:bg-destructive/10"
      : "text-foreground hover:bg-muted",
    disabled ? "opacity-50 pointer-events-none" : "",
  ].join(" ");

  const inner = (
    <>
      {Icon ? (
        <Icon
          className={[
            "h-3.5 w-3.5 shrink-0",
            destructive ? "text-destructive" : "text-muted-foreground",
          ].join(" ")}
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint ? (
        <span className="mono shrink-0 text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {inner}
    </button>
  );
}
