"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { useCommandPalette } from "@/components/command-palette/command-palette";
import { usePermissions } from "@/components/auth/auth-provider";
import {
  COMMAND_ACTIONS,
  type CommandAction,
} from "@/components/command-palette/actions";

/**
 * Global keyboard shortcuts. YC-style leader-key navigation (`g d` for
 * dashboard, `g p` for properties, etc.) plus `/` to focus the current list
 * page's search. `⌘K` lives in `CommandPalette` itself.
 *
 * Shortcuts only fire when the focus is NOT in a text input — typing "g"
 * into a search box shouldn't trigger nav.
 */
export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { open: paletteOpen } = useCommandPalette();
  const { can } = usePermissions();

  useEffect(() => {
    // Compile shortcut → action map from the registry, respecting permissions.
    const shortcutMap = new Map<string, CommandAction>();
    for (const action of COMMAND_ACTIONS) {
      if (!action.shortcut) continue;
      if (action.requires && !can(action.requires)) continue;
      shortcutMap.set(action.shortcut, action);
    }

    let pendingLeader: "g" | null = null;
    let leaderTimeout: ReturnType<typeof setTimeout> | null = null;
    const clearLeader = () => {
      pendingLeader = null;
      if (leaderTimeout) clearTimeout(leaderTimeout);
      leaderTimeout = null;
    };

    const isEditable = (el: Element | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      return false;
    };

    const focusSearch = () => {
      const input = document.querySelector<HTMLInputElement>(
        "[data-resource-search]",
      );
      if (input) input.focus();
    };

    const onKey = (e: KeyboardEvent) => {
      // Never intercept the palette itself — cmdk needs `g` / `/` to reach
      // the input.
      if (paletteOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(document.activeElement)) return;

      // Two-key leader sequence.
      if (pendingLeader === "g") {
        const combo = `g ${e.key.toLowerCase()}`;
        const action = shortcutMap.get(combo);
        clearLeader();
        if (action) {
          e.preventDefault();
          router.push(action.href as Parameters<typeof router.push>[0]);
        }
        return;
      }

      if (e.key === "g") {
        // Only arm the leader if there's at least one `g *` action registered.
        for (const key of shortcutMap.keys()) {
          if (key.startsWith("g ")) {
            e.preventDefault();
            pendingLeader = "g";
            leaderTimeout = setTimeout(clearLeader, 1500);
            return;
          }
        }
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        focusSearch();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (leaderTimeout) clearTimeout(leaderTimeout);
    };
  }, [router, paletteOpen, can]);

  return <>{children}</>;
}
