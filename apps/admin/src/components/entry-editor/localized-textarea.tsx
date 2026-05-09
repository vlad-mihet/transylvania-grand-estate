"use client";

import { useId } from "react";
import { Textarea } from "@tge/ui";
import {
  useController,
  useFormContext,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { useEntryLocale } from "./entry-locale-provider";
import { LocalizedFieldShell } from "./localized-field-shell";
import { PRIMARY_LOCALE, isFilled } from "./types";

export interface LocalizedTextareaProps<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
  rows?: number;
}

export function LocalizedTextarea<T extends FieldValues>({
  name,
  label,
  placeholder,
  required,
  description,
  rows = 4,
}: LocalizedTextareaProps<T>) {
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
      <Textarea
        id={id}
        placeholder={placeholder}
        rows={rows}
        {...field}
        value={value}
      />
    </LocalizedFieldShell>
  );
}
