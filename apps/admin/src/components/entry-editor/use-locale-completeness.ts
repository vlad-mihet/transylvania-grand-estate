"use client";

import { useMemo } from "react";
import { useFormContext, useWatch, type FieldValues, type Path } from "react-hook-form";
import {
  LOCALE_KEYS,
  isFilled,
  type LocaleCompleteness,
  type LocaleErrorCounts,
  type LocaleKey,
} from "./types";

/**
 * Derives per-locale fill status and per-locale error counts from RHF state,
 * watching only the localized field paths (so unrelated form changes don't
 * re-render the switcher chips).
 *
 * Each `localizedField` is the *base* path of a LocalizedString object — e.g.
 * `"title"` or `"meta.description"` — not the per-locale leaf.
 */
export function useLocaleCompleteness<T extends FieldValues>(
  localizedFields: ReadonlyArray<Path<T>>,
  available: readonly LocaleKey[] = LOCALE_KEYS,
): { completeness: LocaleCompleteness; errorCounts: LocaleErrorCounts } {
  const { control, formState } = useFormContext<T>();

  // Watch every locale leaf for every localized field.
  const watchPaths = useMemo<Path<T>[]>(() => {
    const out: string[] = [];
    for (const field of localizedFields) {
      for (const locale of available) out.push(`${field as string}.${locale}`);
    }
    return out as Path<T>[];
  }, [localizedFields, available]);

  const watched = useWatch({ control, name: watchPaths });

  return useMemo(() => {
    const completeness = {
      ro: "missing",
      en: "missing",
      fr: "missing",
      de: "missing",
    } as LocaleCompleteness;
    const errorCounts: LocaleErrorCounts = {};
    const watchedArr = watched as unknown[];
    const fieldCount = localizedFields.length;
    const localeCount = available.length;

    // For each locale, count how many of the localized fields are filled.
    for (let l = 0; l < localeCount; l++) {
      const locale = available[l];
      let filled = 0;
      for (let f = 0; f < fieldCount; f++) {
        if (isFilled(watchedArr[f * localeCount + l])) filled++;
      }
      completeness[locale] =
        filled === 0 ? "missing" : filled === fieldCount ? "filled" : "partial";
    }

    // Walk RHF errors for each localized leaf; an error wins over fill state.
    const errors = formState.errors as Record<
      string,
      Record<string, unknown> | undefined
    >;
    for (const field of localizedFields) {
      const fieldErrors = errors[field as string];
      if (!fieldErrors || typeof fieldErrors !== "object") continue;
      for (const locale of available) {
        if ((fieldErrors as Record<string, unknown>)[locale]) {
          errorCounts[locale] = (errorCounts[locale] ?? 0) + 1;
          completeness[locale] = "error";
        }
      }
    }

    return { completeness, errorCounts };
  }, [watched, localizedFields, available, formState.errors]);
}
