"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher as BaseLanguageSwitcher } from "@tge/ui";
import { usePathname, useRouter } from "@/i18n/navigation";

interface Props {
  variant?: "default" | "compact";
}

/**
 * Thin adapter over the shared `<LanguageSwitcher />` from `@tge/ui`. Uses
 * revery's app-local navigation (`usePathname`/`useRouter`) so switching
 * locale preserves the current path and only swaps the locale prefix.
 */
export function LanguageSwitcher({ variant = "default" }: Props = {}) {
  const t = useTranslations("Navigation");
  return (
    <BaseLanguageSwitcher
      useRouter={useRouter}
      usePathname={usePathname}
      variant={variant}
      label={t("language")}
    />
  );
}
