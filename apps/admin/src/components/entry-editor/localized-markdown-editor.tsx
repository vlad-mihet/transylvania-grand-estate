"use client";

import { useId } from "react";
import {
  useController,
  useFormContext,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { useEntryLocale } from "./entry-locale-provider";
import { LocalizedFieldShell } from "./localized-field-shell";
import { MarkdownSplitView } from "./markdown-split-view";
import { PRIMARY_LOCALE, isFilled } from "./types";

export interface LocalizedMarkdownEditorProps<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
  rows?: number;
}

export function LocalizedMarkdownEditor<T extends FieldValues>({
  name,
  label,
  placeholder,
  required,
  description,
  rows = 14,
}: LocalizedMarkdownEditorProps<T>) {
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
      <MarkdownSplitView
        id={id}
        ariaLabel={label}
        value={value}
        onChange={(next) =>
          setValue(localePath, next as never, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        placeholder={placeholder}
        rows={rows}
      />
    </LocalizedFieldShell>
  );
}
