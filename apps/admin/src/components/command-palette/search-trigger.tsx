"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCommandPalette } from "./command-palette";

/**
 * Header trigger for the unified palette. Visible on every authed admin
 * page and is the only way to open the palette — keyboard shortcuts were
 * intentionally removed.
 *
 * Renders as a wide pill on ≥ sm screens (Linear/Notion style) and as a
 * compact icon button on smaller screens to fit the dense mobile header.
 */
export function SearchTrigger() {
  const { setOpen } = useCommandPalette();
  const t = useTranslations("CommandPalette");

  return (
    <>
      {/* Desktop: pill button with placeholder. Fills the header's center
          column so it reads as a real search affordance, not a chip. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("searchPlaceholder")}
        className="hidden h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground transition-all hover:border-copper/40 hover:bg-background hover:text-foreground hover:shadow-sm sm:flex"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left text-sm">
          {t("searchPlaceholder")}
        </span>
      </button>

      {/* Mobile: icon-only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("searchPlaceholder")}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
      >
        <Search className="h-4 w-4" />
      </button>
    </>
  );
}
