"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher as BaseLanguageSwitcher } from "@tge/ui";
import { usePathname, useRouter } from "@/i18n/navigation";

interface Props {
  variant?: "default" | "compact";
}

/**
 * Thin adapter over the shared `<LanguageSwitcher />` from `@tge/ui`. Uses
 * reveria's app-local typed navigation so the per-locale pathname rewrites
 * (e.g. `/instrumente` ↔ `/tools` ↔ `/outils` ↔ `/werkzeuge`) and dynamic
 * route params (`/properties/[slug]`, `/agents/[slug]`) resolve correctly
 * across locales.
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
