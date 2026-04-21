"use client";

import { Input } from "@tge/ui";
import { Search, X } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";
import { cn } from "@tge/utils";
import { Kbd } from "@/components/shared/mono";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Debounce before firing onValueChange, in ms. Default 200. */
  debounceMs?: number;
  /** Optional keyboard hint rendered inside the input (e.g. "⌘K"). */
  shortcut?: string;
}

/**
 * Debounced search input. Uses local state for the visible value and only
 * surfaces changes through `onValueChange` after `debounceMs` of inactivity,
 * so every keystroke doesn't trigger a URL write + query refetch.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      value,
      onValueChange,
      debounceMs = 200,
      shortcut,
      placeholder = "Search…",
      className,
      ...rest
    },
    ref,
  ) {
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    useEffect(() => {
      if (localValue === value) return;
      const id = setTimeout(() => onValueChange(localValue), debounceMs);
      return () => clearTimeout(id);
    }, [localValue, value, onValueChange, debounceMs]);

    const clear = useCallback(() => {
      setLocalValue("");
      onValueChange("");
      inputRef.current?.focus();
    }, [onValueChange]);

    return (
      <div className={cn("relative flex min-w-0 flex-1 items-center", className)}>
        <Search className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground/70" />
        <Input
          ref={inputRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className="h-9 pl-8 pr-16"
          data-resource-search="true"
          {...rest}
        />
        <div className="pointer-events-none absolute right-2 flex items-center gap-1">
          {localValue && (
            <button
              type="button"
              onClick={clear}
              className="pointer-events-auto rounded-sm p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {!localValue && shortcut && <Kbd>{shortcut}</Kbd>}
        </div>
      </div>
    );
  },
);
