"use client";

import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { AccentButton } from "@tge/ui";

export default function NotFound() {
  const t = useTranslations("NotFoundPage");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="font-serif text-8xl text-copper mb-4">404</h1>
        <h2 className="font-serif text-2xl text-cream mb-4">
          {t("title")}
        </h2>
        <p className="text-cream-muted mb-8 max-w-md">
          {t("description")}
        </p>
        <div className="flex gap-4 justify-center">
          <AccentButton asChild>
            <Link href="/">{t("goHome")}</Link>
          </AccentButton>
          <AccentButton accentVariant="outline" asChild>
            <Link href="/properties">{t("browseProperties")}</Link>
          </AccentButton>
        </div>
      </div>
    </div>
  );
}
