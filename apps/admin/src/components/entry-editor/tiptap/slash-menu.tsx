"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import type { Editor } from "@tiptap/core";
import {
  SLASH_ITEMS,
  type SlashItem,
  type SlashRenderState,
} from "./slash-extension";

interface SlashMenuProps {
  editor: Editor | null;
}

interface MenuPosition {
  top: number;
  left: number;
}

const INITIAL_STATE: SlashRenderState = {
  open: false,
  query: "",
  items: SLASH_ITEMS,
  range: null,
  clientRect: null,
  pick: null,
  onKeyDown: null,
};

/**
 * Floating popover for slash commands. Subscribes to the slash extension's
 * storage; renders a cmdk-driven list anchored below the trigger caret rect.
 *
 * cmdk owns mouse-click selection inside the list. Keyboard navigation goes
 * through `onKeyDown` returned to the extension so arrow / Enter / Esc
 * keystrokes captured by ProseMirror reach this React popover. Refs are
 * synced to React state through `useEffect` (not during render) so the
 * react-hooks/immutability rule stays happy.
 */
export function SlashMenu({ editor }: SlashMenuProps) {
  const [state, setState] = useState<SlashRenderState>(INITIAL_STATE);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Refs kept in sync with state via effect (immutability rule disallows
  // direct ref writes during render). These are the values the keyboard
  // bridge reads when ProseMirror dispatches arrow/Enter.
  const stateRef = useRef(state);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Keyboard bridge — the slash extension forwards every keystroke from the
  // ProseMirror view to this callback. We consume arrow up/down + Enter,
  // return false for everything else so Esc and typing continue to work
  // through the extension's default exit path.
  const handleKeyDown = useCallback((event: KeyboardEvent): boolean => {
    const current = stateRef.current;
    if (!current.open) return false;
    if (current.items.length === 0) return false;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedId((cur) => {
        const idx = current.items.findIndex((i) => i.id === cur);
        const next = current.items[(idx + 1) % current.items.length];
        return next?.id ?? null;
      });
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedId((cur) => {
        const idx = current.items.findIndex((i) => i.id === cur);
        const next =
          current.items[
            (idx - 1 + current.items.length) % current.items.length
          ];
        return next?.id ?? null;
      });
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const id = selectedIdRef.current ?? current.items[0]?.id;
      if (id) current.pick?.({ id });
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!editor) return;
    const storage = (
      editor.storage as unknown as Record<
        string,
        | {
            setListener: (
              l: ((s: SlashRenderState) => void) | null,
            ) => void;
          }
        | undefined
      >
    ).slashCommands;
    if (!storage) return;

    storage.setListener((next) => {
      // Inject the keyboard bridge before storing so the extension's
      // onKeyDown forward reaches our latest cmdk-aware handler.
      const augmented: SlashRenderState = {
        ...next,
        onKeyDown: handleKeyDown,
      };
      setState(augmented);
      const rect = next.clientRect?.();
      setPosition(rect ? { top: rect.bottom + 6, left: rect.left } : null);
      if (next.open && next.items.length > 0) {
        setSelectedId((cur) =>
          cur && next.items.find((i) => i.id === cur) ? cur : next.items[0].id,
        );
      }
    });

    return () => {
      storage.setListener(null);
    };
  }, [editor, handleKeyDown]);

  if (!state.open || !position) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-label="Slash commands"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 60,
      }}
      className="w-64 overflow-hidden rounded-md border border-border bg-popover shadow-md"
    >
      <Command
        shouldFilter={false}
        value={selectedId ?? undefined}
        onValueChange={(v) => setSelectedId(v)}
      >
        <Command.List className="max-h-72 overflow-auto p-1">
          {state.items.length === 0 ? (
            <Command.Empty className="px-3 py-2 text-[11px] text-muted-foreground">
              No matches for &quot;{state.query}&quot;
            </Command.Empty>
          ) : (
            state.items.map((item: SlashItem) => (
              <Command.Item
                key={item.id}
                value={item.id}
                onSelect={() => state.pick?.({ id: item.id })}
                className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-xs aria-selected:bg-muted"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">
                    {item.label}
                  </div>
                  {item.hint ? (
                    <div className="text-[10px] text-muted-foreground">
                      {item.hint}
                    </div>
                  ) : null}
                </div>
              </Command.Item>
            ))
          )}
        </Command.List>
      </Command>
    </div>,
    document.body,
  );
}
