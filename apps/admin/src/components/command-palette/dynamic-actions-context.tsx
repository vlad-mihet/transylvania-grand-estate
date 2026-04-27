"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CommandAction } from "@/components/command-palette/actions";

interface DynamicActionsContextValue {
  actions: CommandAction[];
  register: (key: string, actions: CommandAction[]) => void;
  unregister: (key: string) => void;
}

const Ctx = createContext<DynamicActionsContextValue | null>(null);

/**
 * Holds palette entries injected at runtime by route-scoped surfaces (e.g.
 * a course's lessons appear here while the user is browsing that course).
 * Keyed by an opaque string so a single mount can register a batch and
 * unregister the same batch atomically on unmount.
 */
export function DynamicActionsProvider({ children }: { children: ReactNode }) {
  const [byKey, setByKey] = useState<Record<string, CommandAction[]>>({});

  const register = useCallback((key: string, actions: CommandAction[]) => {
    setByKey((prev) => ({ ...prev, [key]: actions }));
  }, []);

  const unregister = useCallback((key: string) => {
    setByKey((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const actions = useMemo(() => Object.values(byKey).flat(), [byKey]);

  const value = useMemo<DynamicActionsContextValue>(
    () => ({ actions, register, unregister }),
    [actions, register, unregister],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDynamicActions(): CommandAction[] {
  const ctx = useContext(Ctx);
  return ctx?.actions ?? [];
}

/**
 * Registers a batch of palette actions while the calling component is
 * mounted. Pass an empty array (or omit) to clear. The registration is
 * keyed by a stable `key` so updates replace the previous batch instead of
 * appending. Cleared automatically on unmount.
 */
export function useRegisterCommands(
  key: string,
  actions: CommandAction[] | null | undefined,
) {
  const ctx = useContext(Ctx);
  // Latest-actions ref keeps the effect from re-running on every render
  // while still propagating changes — we only re-register when the array
  // identity changes via a shallow id+label comparison.
  const sigRef = useRef<string>("");
  const sig = useMemo(
    () =>
      (actions ?? [])
        .map((a) => `${a.id}|${a.label ?? ""}|${a.href}`)
        .join(""),
    [actions],
  );

  useEffect(() => {
    if (!ctx) return;
    if (!actions || actions.length === 0) {
      ctx.unregister(key);
      sigRef.current = "";
      return;
    }
    ctx.register(key, actions);
    sigRef.current = sig;
    return () => {
      ctx.unregister(key);
    };
    // ctx is stable from a memoized provider value; sig captures actions changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, sig]);
}
