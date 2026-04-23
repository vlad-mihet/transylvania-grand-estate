"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@tge/ui";
import { Container } from "@/components/layout/container";

export default function NotFound() {
  const t = useTranslations("NotFoundPage");

  return (
    <div className="min-h-[70vh] flex items-center bg-background">
      <Container>
        <div className="mx-auto max-w-xl text-center py-16 md:py-24">
          <p
            aria-hidden="true"
            className="text-[9rem] leading-none font-bold text-primary/90 mb-2 select-none"
          >
            404
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mb-10 mx-auto max-w-md">
            {t("description")}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/">{t("goHome")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/properties">{t("browseProperties")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/blog">{t("browseArticles")}</Link>
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
