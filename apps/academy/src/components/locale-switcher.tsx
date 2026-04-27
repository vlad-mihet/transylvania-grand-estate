"use client";

import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@tge/ui";
import { usePathname, useRouter } from "@/i18n/navigation";
import { apiFetch, getAccessToken } from "@/lib/api-client";

interface Props {
  variant?: "default" | "compact";
}

/**
 * Thin adapter over the shared `<LanguageSwitcher />` from `@tge/ui`. Wires
 * academy's typed router so dynamic routes resolve correctly, and persists
 * the choice fire-and-forget to the AcademyUser record so the next login
 * lands in the same language.
 */
export function LocaleSwitcher({ variant = "default" }: Props) {
  const t = useTranslations("Academy.nav");

  return (
    <LanguageSwitcher
      useRouter={useRouter}
      usePathname={usePathname}
      variant={variant}
      label={t("languageLabel")}
      onLocaleChange={(next) => {
        if (!getAccessToken()) return;
        // Fire-and-forget — navigation doesn't wait, and a failed write
        // leaves the DB locale stale, which the next login fixes.
        apiFetch("/academy/auth/me", {
          method: "PATCH",
          body: { locale: next },
        }).catch(() => undefined);
      }}
    />
  );
}
