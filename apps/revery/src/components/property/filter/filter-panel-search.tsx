"use client";

import { Input, Label } from "@tge/ui";
import { Search } from "lucide-react";

interface FilterPanelSearchProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  labelText: string;
  placeholder: string;
  labelClassName: string;
}

/**
 * Sidebar search input with an inline search-icon button + Enter-to-submit.
 * Extracted so the panel orchestrator doesn't carry the keyboard-handling and
 * positional markup inline.
 */
export function FilterPanelSearch({
  value,
  onChange,
  onSubmit,
  labelText,
  placeholder,
  labelClassName,
}: FilterPanelSearchProps) {
  return (
    <div className="space-y-2.5">
      <Label className={labelClassName}>{labelText}</Label>
      <div className="relative">
        <button
          onClick={onSubmit}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          type="button"
        >
          <Search className="h-4 w-4" />
        </button>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          className="h-11 pl-11 rounded-lg border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
