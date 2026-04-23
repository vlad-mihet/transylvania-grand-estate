"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@tge/ui";
import { AlertTriangle } from "lucide-react";
import { Container } from "@/components/layout/container";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("ErrorPage");

  useEffect(() => {
    console.error("[reveria:error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center bg-background">
      <Container>
        <div className="mx-auto max-w-md text-center py-16 md:py-24">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mb-8">{t("description")}</p>
          {error.digest && (
            <p className="font-mono text-[11px] text-muted-foreground/70 mb-6">
              digest: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={reset}>{t("retry")}</Button>
            <Button variant="outline" asChild>
              <Link href="/">{t("goHome")}</Link>
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
