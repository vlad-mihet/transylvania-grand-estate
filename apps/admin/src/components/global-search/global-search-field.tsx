"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { cn } from "@tge/utils";
import { Kbd } from "@/components/shared/mono";
import type { SearchResultItem } from "@tge/types/schemas/search";
import { useGlobalSearch } from "./use-global-search";
import { GlobalSearchPopover } from "./global-search-popover";

export interface GlobalSearchFieldHandle {
  focus: () => void;
  clear: () => void;
}

export interface GlobalSearchFieldProps {
  /** Auto-focus the input on mount. Used inside the mobile Dialog. */
  autoFocus?: boolean;
  /** Called when the user selects a result (to route + dismiss wrapping UI). */
  onSelect: (item: SearchResultItem) => void;
  /** Called when the user dismisses the popover via Esc or show-all jump. */
  onDismiss?: () => void;
  /** Layout hint. Desktop anchors the popover absolutely under the input;
   *  "inline" renders it directly below in the flow (for Dialog use). */
  popoverLayout?: "absolute" | "inline";
  /** Show the `/` shortcut chip when empty. Desktop yes; inside Dialog no. */
  showShortcutHint?: boolean;
  className?: string;
}

/**
 * Headless-ish search field: input + results popover, nothing else. The
 * surrounding wrappers (desktop header slot, mobile Dialog) own global
 * keybindings, outside-click, and responsive visibility.
 */
export const GlobalSearchField = forwardRef<
  GlobalSearchFieldHandle,
  GlobalSearchFieldProps
>(function GlobalSearchField(
  {
    autoFocus,
    onSelect,
    onDismiss,
    popoverLayout = "absolute",
    showShortcutHint = true,
    className,
  },
  ref,
) {
  const t = useTranslations("GlobalSearch");
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  const { debouncedQuery, data, isLoading, isError } = useGlobalSearch(value);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => setValue(""),
    }),
    [],
  );

  const dismiss = useCallback(() => {
    setValue("");
    setFocused(false);
    inputRef.current?.blur();
    onDismiss?.();
  }, [onDismiss]);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (value) {
        setValue("");
      } else {
        dismiss();
      }
    }
  };

  const handleClear = () => {
    setValue("");
    inputRef.current?.focus();
  };

  const showPopover = focused || value.length > 0;

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-xs transition-colors",
          "focus-within:border-copper/60 focus-within:bg-background",
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showPopover}
          aria-controls="global-search-popover"
          aria-autocomplete="list"
          autoFocus={autoFocus}
          value={value}
          placeholder={t("placeholder")}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-sm p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("clear")}
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          showShortcutHint && <Kbd>/</Kbd>
        )}
      </div>

      {showPopover && (
        <div
          id="global-search-popover"
          className={cn(
            popoverLayout === "absolute"
              ? "absolute left-0 right-0 top-full z-50 mt-1.5"
              : "mt-2",
          )}
        >
          <GlobalSearchPopover
            query={debouncedQuery}
            data={data}
            isLoading={isLoading}
            isError={isError}
            onSelect={onSelect}
            onDismiss={dismiss}
          />
        </div>
      )}
    </div>
  );
});
