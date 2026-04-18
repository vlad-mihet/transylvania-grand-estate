"use client";

import { ROOM_OPTIONS } from "./filter-bar-types";

interface RoomTogglesProps {
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * 1 / 2 / 3 / 4 / 5 / 6+ connected toggle buttons, multi-select. Each value
 * is stored verbatim — "6+" is a sentinel the URL builder maps to
 * `minBedrooms=6`, while exact values map to repeated `bedrooms=N`.
 */
export function RoomToggles({ value, onChange }: RoomTogglesProps) {
  const selected = new Set(value);
  return (
    <div className="flex overflow-x-auto">
      {ROOM_OPTIONS.map((room) => {
        const isActive = selected.has(room);
        return (
          <button
            key={room}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              const next = new Set(selected);
              if (isActive) next.delete(room);
              else next.add(room);
              onChange(ROOM_OPTIONS.filter((r) => next.has(r)));
            }}
            className={`h-11 min-w-[44px] px-2 flex items-center justify-center text-sm font-medium border cursor-pointer transition-colors first:rounded-l-lg last:rounded-r-lg -ml-px first:ml-0 shrink-0 ${
              isActive
                ? "bg-primary text-primary-foreground border-primary z-10 relative"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            {room}
          </button>
        );
      })}
    </div>
  );
}
