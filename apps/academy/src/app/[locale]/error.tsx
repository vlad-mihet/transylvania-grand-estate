"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Academy");

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-3">{t("errors.generic")}</h1>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
          <Link href="/" className="text-sm text-[color:var(--color-muted-foreground)] underline">
            {t("appName")}
          </Link>
        </div>
      </div>
    </div>
  );
}
