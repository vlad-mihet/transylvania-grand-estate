"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FieldPath,
  FieldValues,
  UseFormReturn,
} from "react-hook-form";

export type AutosaveState =
  | { kind: "idle" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

interface UseAutosaveOptions<T extends FieldValues, Payload> {
  /** RHF form instance returned by `useForm<T>()`. */
  form: UseFormReturn<T>;
  /** Field paths whose changes should trigger autosave (typically localized content fields). */
  watchPaths: ReadonlyArray<FieldPath<T>>;
  /**
   * Builds the autosave payload from current form values. Should strip
   * everything except the watched fields and add `mode: "draft"`.
   */
  buildPayload: (values: T) => Payload | null;
  /** Mutator that performs the actual PUT. Resolves on success, rejects on failure. */
  save: (payload: Payload) => Promise<unknown>;
  /** Master switch — only auto-save in edit mode, never on freshly-created entries. */
  enabled: boolean;
  /** Debounce window. Default 2000ms matches the plan; lower for tighter UX. */
  debounceMs?: number;
}

/**
 * Debounced draft autosave for the entry editor. Subscribes to a small set
 * of localized field paths via RHF `watch`, fires the supplied save mutator
 * `debounceMs` after the last keystroke, and tracks state for the header
 * indicator.
 *
 * Deliberately bypasses zodResolver validation — autosave should keep
 * shorter-than-min content out of the way (the schema requires `min(1)` on
 * `title.ro`/`title.en`/etc., so transient empties would 400). The
 * `buildPayload` callback owns the "is this safe to send" decision and
 * should return `null` to skip a tick.
 *
 * NOTE: this hook does not implement the optimistic-concurrency conflict
 * guard from the plan (expectedUpdatedAt header → 409 → user reload). That
 * lives on the API side and is left as a follow-up; until it lands, two
 * tabs editing the same article in parallel land in last-write-wins on the
 * draft column. Data loss is bounded to the draft (live copy is untouched
 * by autosave) so the risk envelope is acceptable.
 *
 * Returns the current state plus a `flushNow` callback so the page can
 * trigger an immediate save on ⌘S.
 */
export function useAutosave<T extends FieldValues, Payload>({
  form,
  watchPaths,
  buildPayload,
  save,
  enabled,
  debounceMs = 2000,
}: UseAutosaveOptions<T, Payload>): {
  state: AutosaveState;
  flushNow: () => void;
} {
  const [state, setState] = useState<AutosaveState>({ kind: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef(false);
  const pendingRef = useRef(false);

  const buildPayloadRef = useRef(buildPayload);
  buildPayloadRef.current = buildPayload;
  const saveRef = useRef(save);
  saveRef.current = save;
  const formRef = useRef(form);
  formRef.current = form;

  const performSave = useCallback(async () => {
    if (inflightRef.current) {
      // Another save is in flight — record a pending request and let the
      // in-flight tick re-arm itself on completion.
      pendingRef.current = true;
      return;
    }
    const values = formRef.current.getValues();
    const payload = buildPayloadRef.current(values);
    if (payload == null) {
      setState({ kind: "idle" });
      return;
    }
    inflightRef.current = true;
    setState({ kind: "saving" });
    try {
      await saveRef.current(payload);
      setState({ kind: "saved", at: Date.now() });
      // Reset the form's `isDirty` baseline so we don't keep firing autosave
      // for a payload that's already on the server.
      formRef.current.reset(formRef.current.getValues(), {
        keepValues: true,
        keepDirty: false,
        keepDirtyValues: false,
        keepErrors: true,
        keepIsValid: true,
        keepTouched: true,
        keepIsSubmitted: false,
        keepSubmitCount: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Autosave failed";
      setState({ kind: "error", message });
    } finally {
      inflightRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        // Re-run on the next tick so React batches state updates first.
        setTimeout(performSave, 0);
      }
    }
  }, []);

  const flushNow = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void performSave();
  }, [enabled, performSave]);

  // Subscribe to changes on the watched paths. The `watch` callback fires
  // for any field — we filter to the localized content set so autosave isn't
  // triggered by slug or metadata edits (those need explicit save).
  useEffect(() => {
    if (!enabled) return;
    const subscription = formRef.current.watch((_values, info) => {
      const name = info.name;
      if (!name) return;
      const watched = watchPaths.some((p) => name === p || name.startsWith(`${p}.`));
      if (!watched) return;
      setState((prev) =>
        prev.kind === "saving" || prev.kind === "error"
          ? prev
          : { kind: "dirty" },
      );
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void performSave();
      }, debounceMs);
    });
    return () => {
      subscription.unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, watchPaths, debounceMs, performSave]);

  return { state, flushNow };
}
