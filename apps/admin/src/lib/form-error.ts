"use client";

import { useEffect } from "react";
import type {
  FieldPath,
  FieldValues,
  UseFormReturn,
} from "react-hook-form";
import { ApiError } from "@tge/api-client";

/**
 * Mirror of the API's Zod error payload shape. The API's
 * `HttpExceptionFilter` emits `body.error.fields[]` when a request fails
 * Zod validation; `@tge/api-client`'s `ApiError` surfaces it as the
 * `.fields` property.
 */
export interface ApiFieldIssue {
  path: string;
  message: string;
  code?: string;
}

export function getApiFields(error: unknown): ApiFieldIssue[] | undefined {
  if (error instanceof ApiError && error.fields) return error.fields;
  if (
    typeof error === "object" &&
    error !== null &&
    "fields" in error &&
    Array.isArray((error as { fields?: unknown }).fields)
  ) {
    return (error as { fields: ApiFieldIssue[] }).fields;
  }
  return undefined;
}

/**
 * Apply a failed mutation's field-level Zod errors onto a react-hook-form
 * instance — each `fields[].path` becomes a `form.setError(path, …)` call
 * so the input that failed validation lights up with the API's message.
 * Returns `true` if any field errors were applied; `false` if the error
 * wasn't a Zod failure (caller can fall back to a toast).
 */
export function applyApiFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
): boolean {
  const fields = getApiFields(error);
  if (!fields || fields.length === 0) return false;
  for (const issue of fields) {
    if (!issue.path) continue;
    form.setError(issue.path as FieldPath<T>, {
      type: issue.code ?? "server",
      message: issue.message,
    });
  }
  return true;
}

/**
 * Hook form variant: wire a mutation's error state to the form. Place this
 * inside a form component and pass `mutation.error` as the second arg. When
 * the error changes, Zod field errors get applied automatically and
 * non-field errors return via the `onFallback` callback (typically a
 * toast).
 */
export function useApiFormErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  onFallback?: (error: unknown) => void,
): void {
  useEffect(() => {
    if (!error) return;
    const applied = applyApiFieldErrors(form, error);
    if (!applied && onFallback) onFallback(error);
  }, [error, form, onFallback]);
}
