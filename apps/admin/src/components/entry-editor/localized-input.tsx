"use client";

import { useId } from "react";
import { Input } from "@tge/ui";
import {
  useController,
  useFormContext,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { useEntryLocale } from "./entry-locale-provider";
import { LocalizedFieldShell } from "./localized-field-shell";
import { PRIMARY_LOCALE, isFilled } from "./types";

export interface LocalizedInputProps<T extends FieldValues> {
  /** Path to a LocalizedString object on the form values, e.g. "title". */
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
}

export function LocalizedInput<T extends FieldValues>({
  name,
  label,
  placeholder,
  required,
  description,
}: LocalizedInputProps<T>) {
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
      <Input id={id} placeholder={placeholder} {...field} value={value} />
    </LocalizedFieldShell>
  );
}
