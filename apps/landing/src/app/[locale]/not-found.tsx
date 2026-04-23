"use client";

import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { AccentButton } from "@tge/ui";
import { Container } from "@/components/layout/container";

export default function NotFound() {
  const t = useTranslations("NotFoundPage");

  return (
    <div className="min-h-[70vh] flex items-center bg-background">
      <Container>
        <div className="mx-auto max-w-xl text-center py-20 md:py-28">
          <p
            aria-hidden="true"
            className="font-serif text-[9rem] leading-none text-copper mb-2 select-none"
          >
            404
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-cream mb-4">
            {t("title")}
          </h1>
          <p className="text-cream-muted mb-10 mx-auto max-w-md">
            {t("description")}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <AccentButton asChild>
              <Link href="/">{t("goHome")}</Link>
            </AccentButton>
            <AccentButton accentVariant="outline" asChild>
              <Link href="/properties">{t("browseProperties")}</Link>
            </AccentButton>
            <AccentButton accentVariant="outline" asChild>
              <Link href="/about">{t("learnMore")}</Link>
            </AccentButton>
          </div>
        </div>
      </Container>
    </div>
  );
}
