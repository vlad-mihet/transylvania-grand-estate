"use client";

import { X } from "lucide-react";
import type { LocationSelection } from "../location-picker-types";

interface ChipRowProps {
  selections: LocationSelection[];
  query: string;
  placeholder: string;
  open: boolean;
  variant: "sidebar" | "hero";
  onQueryChange: (next: string) => void;
  onFocus: () => void;
  onClickRow: () => void;
  onRemoveSelection: (idx: number) => void;
  onClearAll: () => void;
}

/**
 * The visible picker bar: selected chips + a typeahead input. Clicking the
 * row or focusing the input opens the dropdown; the state machine for
 * "main / search / drilldown" is owned by the parent.
 */
export function LocationPickerChipRow({
  selections,
  query,
  placeholder,
  open,
  variant,
  onQueryChange,
  onFocus,
  onClickRow,
  onRemoveSelection,
  onClearAll,
}: ChipRowProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 min-h-[44px] w-full border rounded-lg bg-background px-3 py-1.5 cursor-text ${
        variant === "hero" ? "border-gray-200" : "border-border"
      } ${open ? "ring-2 ring-primary/30 border-primary" : ""}`}
      onClick={onClickRow}
    >
      {selections.map((sel, i) => (
        <span
          key={`${sel.label}-${i}`}
          className="inline-flex items-center gap-1 bg-secondary text-foreground text-sm font-medium rounded-md px-2 py-0.5 max-w-[160px]"
        >
          <span className="truncate">{sel.label}</span>
          <X
            className="h-3 w-3 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveSelection(i);
            }}
          />
        </span>
      ))}

      <input
        type="text"
        placeholder={selections.length === 0 ? placeholder : ""}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={onFocus}
        className="flex-1 min-w-[80px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
      />

      {selections.length > 0 && (
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {selections.length > 1 && (
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {selections.length}
            </span>
          )}
          <X
            className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onClearAll();
            }}
          />
        </div>
      )}
    </div>
  );
}
