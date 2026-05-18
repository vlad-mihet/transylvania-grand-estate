"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface OutlineHeading {
  level: 1 | 2 | 3 | 4;
  text: string;
  /** ProseMirror position; consumer dispatches via `editor.chain().focus(pos)`. */
  pos: number;
}

interface OutlineContextValue {
  headings: OutlineHeading[];
  setHeadings: (next: OutlineHeading[]) => void;
  /**
   * Click-to-jump dispatcher. The editor registers via `setOnJump`; consumers
   * (e.g. the outline sidebar) invoke `jump(pos)` to focus + scroll. Kept off
   * the editor instance because the outline component lives outside the
   * editor's React tree.
   */
  jump: (pos: number) => void;
  setOnJump: (fn: ((pos: number) => void) | null) => void;
}

const EntryOutlineContext = createContext<OutlineContextValue | null>(null);

/**
 * Wraps the entry editor so the canvas (deep inside `LocalizedTiptapEditor`)
 * can publish its current document outline and the sidebar (a sibling at the
 * shell level) can render + click-to-jump. The provider keeps the outline
 * state out of form state so heading changes don't mark the form dirty.
 */
export function EntryOutlineProvider({ children }: { children: ReactNode }) {
  const [headings, setHeadings] = useState<OutlineHeading[]>([]);
  const jumpRef = useRef<((pos: number) => void) | null>(null);

  const setOnJump = useCallback((fn: ((pos: number) => void) | null) => {
    jumpRef.current = fn;
  }, []);

  const jump = useCallback((pos: number) => {
    jumpRef.current?.(pos);
  }, []);

  // Equality-bail to avoid re-renders when the editor pushes the same list
  // (every transaction triggers an emit, but most don't change headings).
  const setHeadingsStable = useCallback((next: OutlineHeading[]) => {
    setHeadings((prev) => {
      if (prev.length !== next.length) return next;
      for (let i = 0; i < next.length; i++) {
        const a = prev[i];
        const b = next[i];
        if (a.level !== b.level || a.text !== b.text || a.pos !== b.pos) {
          return next;
        }
      }
      return prev;
    });
  }, []);

  const value = useMemo<OutlineContextValue>(
    () => ({ headings, setHeadings: setHeadingsStable, jump, setOnJump }),
    [headings, setHeadingsStable, jump, setOnJump],
  );

  return (
    <EntryOutlineContext.Provider value={value}>
      {children}
    </EntryOutlineContext.Provider>
  );
}

/** Reader hook for the outline sidebar. Returns an empty list when there's
 *  no editor mounted (e.g. metadata-only pages). */
export function useEntryOutline(): OutlineContextValue {
  const ctx = useContext(EntryOutlineContext);
  if (!ctx) {
    // Soft-fail rather than throw: forms that don't use the outline can still
    // mount the shell without wrapping in the provider.
    return {
      headings: [],
      setHeadings: () => {},
      jump: () => {},
      setOnJump: () => {},
    };
  }
  return ctx;
}
