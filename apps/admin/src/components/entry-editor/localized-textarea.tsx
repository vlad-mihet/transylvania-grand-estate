"use client";

import { useId } from "react";
import { Textarea } from "@tge/ui";
import {
  useController,
  useFormContext,
  useFormState,
  useWatch,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { useEntryLocale } from "./entry-locale-provider";
import { LocalizedFieldShell } from "./localized-field-shell";
import { PRIMARY_LOCALE, isFilled, type LocaleKey } from "./types";

export interface LocalizedTextareaProps<T extends FieldValues> {
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
  rows?: number;
}

/**
 * Localized multi-line variant of {@link LocalizedInput}. Same rule: one
 * controller per locale, all mounted with static names, only the active one
 * visible — so no locale's value is dropped when the editing locale switches
 * (see LocalizedInput for the full rationale).
 */
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
  const { active, available } = useEntryLocale();
  const { control, setValue, getFieldState } = useFormContext<T>();

  const activePath = `${name as string}.${active}` as FieldPath<T>;
  const primaryPath = `${name as string}.${PRIMARY_LOCALE}` as FieldPath<T>;

  const formState = useFormState<T>({ control, name: activePath });
  const [activeValueRaw, primaryValueRaw] = useWatch<T>({
    control,
    name: [activePath, primaryPath] as FieldPath<T>[],
  }) as unknown as (string | undefined)[];

  const errorMessage = getFieldState(activePath, formState).error?.message;
  const showCopy =
    active !== PRIMARY_LOCALE &&
    !isFilled(activeValueRaw ?? "") &&
    isFilled(primaryValueRaw);

  return (
    <LocalizedFieldShell
      id={id}
      label={label}
      required={required}
      description={description}
      errorMessage={errorMessage}
      showCopyFromPrimary={showCopy}
      onCopyFromPrimary={() =>
        setValue(activePath, (primaryValueRaw ?? "") as never, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    >
      {available.map((locale) => (
        <LocaleTextareaSlot<T>
          key={locale}
          name={name}
          locale={locale}
          id={locale === active ? id : `${id}-${locale}`}
          placeholder={placeholder}
          rows={rows}
          hidden={locale !== active}
        />
      ))}
    </LocalizedFieldShell>
  );
}

function LocaleTextareaSlot<T extends FieldValues>({
  name,
  locale,
  id,
  placeholder,
  rows,
  hidden,
}: {
  name: FieldPath<T>;
  locale: LocaleKey;
  id: string;
  placeholder?: string;
  rows: number;
  hidden: boolean;
}) {
  const { control } = useFormContext<T>();
  const { field } = useController<T>({
    name: `${name as string}.${locale}` as FieldPath<T>,
    control,
  });
  const value = (field.value as string | undefined) ?? "";
  return (
    <Textarea
      id={id}
      placeholder={placeholder}
      rows={rows}
      {...field}
      value={value}
      className={hidden ? "hidden" : undefined}
    />
  );
}
