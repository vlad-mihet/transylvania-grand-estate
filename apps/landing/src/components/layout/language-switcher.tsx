"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher as BaseLanguageSwitcher } from "@tge/ui";
import { usePathname, useRouter } from "@tge/i18n/navigation";

interface Props {
  variant?: "default" | "compact";
}

/**
 * Thin adapter over the shared `<LanguageSwitcher />` from `@tge/ui`. Uses the
 * shared `@tge/i18n/navigation` hooks because landing has no app-local typed
 * routing.
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
