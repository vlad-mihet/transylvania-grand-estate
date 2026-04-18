"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@tge/ui";

export default function NotFound() {
  const t = useTranslations("NotFoundPage");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          {t("title")}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          {t("description")}
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/">{t("goHome")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/properties">{t("browseProperties")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
