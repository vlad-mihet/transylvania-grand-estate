"use client";

import { useId } from "react";
import { Input } from "@tge/ui";
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

export interface LocalizedInputProps<T extends FieldValues> {
  /** Path to a LocalizedString object on the form values, e.g. "title". */
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
}

/**
 * One controlled input per locale, all mounted at once with **static** field
 * names — only the active locale is visible; the rest are display:none.
 *
 * Why not a single `useController` bound to `"${name}.${active}"`: a controller
 * whose `name` changes on locale switch makes RHF drop the previous locale's
 * value, so only the active locale stays registered. On a single-submit form
 * (like the property form) every inactive locale then serializes as `undefined`
 * and Zod rejects it ("expected string, received undefined") — the save never
 * reaches the API. Keeping every locale permanently registered fixes that.
 */
export function LocalizedInput<T extends FieldValues>({
  name,
  label,
  placeholder,
  required,
  description,
}: LocalizedInputProps<T>) {
  const reactId = useId();
  const id = `${(name as string).replace(/\W+/g, "-")}-${reactId}`;
  const { active, available } = useEntryLocale();
  const { control, setValue, getFieldState } = useFormContext<T>();

  const activePath = `${name as string}.${active}` as FieldPath<T>;
  const primaryPath = `${name as string}.${PRIMARY_LOCALE}` as FieldPath<T>;

  // Subscribe (not register) to the active + primary leaves so the shell's
  // error message and the "translate from RO" affordance stay reactive without
  // introducing a second, name-changing controller.
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
        <LocaleInputSlot<T>
          key={locale}
          name={name}
          locale={locale}
          id={locale === active ? id : `${id}-${locale}`}
          placeholder={placeholder}
          hidden={locale !== active}
        />
      ))}
    </LocalizedFieldShell>
  );
}

function LocaleInputSlot<T extends FieldValues>({
  name,
  locale,
  id,
  placeholder,
  hidden,
}: {
  name: FieldPath<T>;
  locale: LocaleKey;
  id: string;
  placeholder?: string;
  hidden: boolean;
}) {
  const { control } = useFormContext<T>();
  const { field } = useController<T>({
    name: `${name as string}.${locale}` as FieldPath<T>,
    control,
  });
  const value = (field.value as string | undefined) ?? "";
  return (
    <Input
      id={id}
      placeholder={placeholder}
      {...field}
      value={value}
      className={hidden ? "hidden" : undefined}
    />
  );
}
