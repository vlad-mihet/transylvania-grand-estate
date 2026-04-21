"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@tge/ui";
import { useRouter } from "@/i18n/navigation";
import type { Route } from "next";
import type { SearchResultItem } from "@tge/types/schemas/search";
import {
  GlobalSearchField,
  type GlobalSearchFieldHandle,
} from "./global-search-field";

/**
 * Responsive global search for the admin header.
 *
 * - ≥ sm: inline centered input + live popover below (desktop admin UX).
 * - < sm: hidden input, a Search icon button that opens a Dialog with the
 *   same field inside. Keeps mobile usable without cramming an input into a
 *   12-height header alongside user-menu and menu toggle.
 *
 * Complements the ⌘K command palette (static nav actions); it does NOT
 * replace it. Global `/` keybinding focuses the desktop input.
 */
export function GlobalSearch() {
  const t = useTranslations("GlobalSearch");
  const router = useRouter();
  const desktopFieldRef = useRef<GlobalSearchFieldHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // `/` to focus search — skip if typing in another editable control, and
  // skip when the mobile Dialog is already open (cmdk-inside-Dialog will
  // handle its own key events).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (mobileOpen) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (target && target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      desktopFieldRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Dismiss the desktop popover when the user clicks / taps outside. The
  // field itself closes on blur, but the popover-click-then-blur race
  // (mousedown on popover before input fires blur) means we also need an
  // explicit outside-handler to collapse on navigation-away.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      desktopFieldRef.current?.clear();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleDesktopSelect = useCallback(
    (item: SearchResultItem) => {
      desktopFieldRef.current?.clear();
      router.push(item.href as Route);
    },
    [router],
  );

  const handleMobileSelect = useCallback(
    (item: SearchResultItem) => {
      setMobileOpen(false);
      router.push(item.href as Route);
    },
    [router],
  );

  return (
    <>
      {/* Desktop: inline field */}
      <div
        ref={rootRef}
        className="relative hidden w-full max-w-[520px] sm:block"
      >
        <GlobalSearchField
          ref={desktopFieldRef}
          onSelect={handleDesktopSelect}
          popoverLayout="absolute"
          showShortcutHint
        />
      </div>

      {/* Mobile: Dialog-wrapped field. The trigger stays on the right of the
          header via the wrapper's layout; we render it inline here. */}
      <div className="sm:hidden">
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={t("placeholder")}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Search className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="top-[10vh] max-w-[min(92vw,520px)] translate-y-0 p-3 sm:top-[10vh]">
            <DialogHeader className="pb-2">
              <DialogTitle className="mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("placeholder")}
              </DialogTitle>
            </DialogHeader>
            <GlobalSearchField
              autoFocus
              onSelect={handleMobileSelect}
              onDismiss={() => setMobileOpen(false)}
              popoverLayout="inline"
              showShortcutHint={false}
            />
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
