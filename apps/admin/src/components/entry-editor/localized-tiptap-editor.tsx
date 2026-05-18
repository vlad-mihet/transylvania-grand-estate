"use client";

import { useId } from "react";
import dynamic from "next/dynamic";
import {
  useController,
  useFormContext,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { useEntryLocale } from "./entry-locale-provider";
import { LocalizedFieldShell } from "./localized-field-shell";
import { PRIMARY_LOCALE, isFilled } from "./types";

/**
 * Lazy-load the inner Tiptap surface (~280 KB gzipped including extensions
 * and the markdown serializer). Editor pages are client-only behind auth, so
 * ssr:false is safe and keeps the editor chunk out of any route that doesn't
 * mount the editor (article list, lesson list, etc.).
 */
const EditorCore = dynamic(
  () => import("./tiptap/editor-core").then((m) => m.EditorCore),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[260px] items-center justify-center rounded-md border border-border bg-card text-[11px] text-muted-foreground">
        Loading editor…
      </div>
    ),
  },
);

export interface LocalizedTiptapEditorProps<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
}

/**
 * React-hook-form Controller bridge for the Tiptap-powered content editor.
 * Prop shape matches `LocalizedMarkdownEditor` so swapping is mechanical at
 * the call site.
 *
 * Locale switching: when the active locale changes (driven by the URL via
 * `EntryLocaleProvider`), the value at `${name}.${active}` flows into the
 * editor through normal React rendering. The editor reconciles via its
 * `value` prop and clears undo history when `resetToken` changes — see
 * `editor-core.tsx`. There is no explicit "flush" step because the editor's
 * `onUpdate` already writes back to form state on every keystroke, so the
 * previous locale's content is durable in `getValues()` before the swap.
 */
export function LocalizedTiptapEditor<T extends FieldValues>({
  name,
  label,
  placeholder,
  required,
  description,
}: LocalizedTiptapEditorProps<T>) {
  const reactId = useId();
  const id = `${(name as string).replace(/\W+/g, "-")}-${reactId}`;
  const { active } = useEntryLocale();
  const { control, setValue, getValues } = useFormContext<T>();

  const localePath = `${name as string}.${active}` as FieldPath<T>;
  const primaryPath = `${name as string}.${PRIMARY_LOCALE}` as FieldPath<T>;

  const { field, fieldState } = useController<T>({
    name: localePath,
    control,
  });

  const value = (field.value as string | undefined) ?? "";
  const primaryValue = getValues(primaryPath) as string | undefined;
  const showCopy =
    active !== PRIMARY_LOCALE && !isFilled(value) && isFilled(primaryValue);

  return (
    <LocalizedFieldShell
      id={id}
      label={label}
      required={required}
      description={description}
      errorMessage={fieldState.error?.message}
      showCopyFromPrimary={showCopy}
      onCopyFromPrimary={() =>
        setValue(localePath, primaryValue as never, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    >
      <EditorCore
        value={value}
        onChange={(next) =>
          setValue(localePath, next as never, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        placeholder={placeholder}
        ariaLabel={label}
        resetToken={`${name as string}-${active}`}
      />
    </LocalizedFieldShell>
  );
}
