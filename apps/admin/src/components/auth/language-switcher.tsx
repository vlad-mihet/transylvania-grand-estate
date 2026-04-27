"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher as BaseLanguageSwitcher } from "@tge/ui";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Compact locale picker for the auth-shell footer. Sits next to the version
 * chip and copyright; the rest of the admin app puts the picker in the
 * header user-menu submenu instead.
 */
export function LanguageSwitcher() {
  const t = useTranslations("Header");
  return (
    <BaseLanguageSwitcher
      useRouter={useRouter}
      usePathname={usePathname}
      variant="compact"
      label={t("language")}
    />
  );
}
