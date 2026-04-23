"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function LocaleNotFound() {
  const t = useTranslations("Academy");
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md text-center">
        <p className="text-6xl font-bold text-[color:var(--color-primary)] mb-2">404</p>
        <h1 className="text-2xl font-semibold mb-3">{t("errors.generic")}</h1>
        <Link
          href="/"
          className="inline-block rounded-md bg-[color:var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          {t("appName")}
        </Link>
      </div>
    </div>
  );
}
