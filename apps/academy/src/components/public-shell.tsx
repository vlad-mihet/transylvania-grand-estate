"use client";

import { useTranslations } from "next-intl";
import { Award, BookOpen, Compass } from "lucide-react";
import { LocaleSwitcher } from "./locale-switcher";

/**
 * Two-panel chrome for every logged-out page (login, register, verify, reset,
 * invite). Left is a brand splash; right hosts the form on a white surface —
 * children render naked (no nested cards).
 *
 * The brand panel is `aria-hidden`: every auth page already exposes its own
 * `<h1>`, so SR users skip the marketing copy and land on the form heading.
 * Brand presence for SR users comes from the page `<title>`; for sighted
 * users below `lg` it's restored as a wordmark in the right-panel header.
 *
 * Wordmarks are non-clickable `<span>`s — Academy has no public landing,
 * and routing the logo to `/` would bounce auth-gated visitors right back
 * to `/login`.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Academy");

  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden bg-gradient-to-br from-[color:var(--color-primary)] via-[#6d28d9] to-[#7c3aed] p-12 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-16 xl:p-20"
      >
        <div className="relative z-10">
          <span className="text-sm font-semibold tracking-wide text-white">
            {t("appName")}
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight xl:text-[2.75rem]">
            {t("publicShell.brand.headline")}
          </h2>
          <p className="mt-4 text-base text-white/85">{t("tagline")}</p>

          <ul className="mt-10 space-y-5 text-sm">
            <BrandFeature
              icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
              title={t("publicShell.brand.feature1Title")}
              description={t("publicShell.brand.feature1Description")}
            />
            <BrandFeature
              icon={<Compass className="h-4 w-4" aria-hidden="true" />}
              title={t("publicShell.brand.feature2Title")}
              description={t("publicShell.brand.feature2Description")}
            />
            <BrandFeature
              icon={<Award className="h-4 w-4" aria-hidden="true" />}
              title={t("publicShell.brand.feature3Title")}
              description={t("publicShell.brand.feature3Description")}
            />
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/65">
          © {new Date().getFullYear()} TGE
        </p>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5 blur-3xl"
        />
      </aside>

      <section className="relative flex flex-1 flex-col bg-white">
        <header className="flex items-center justify-between gap-3 px-6 py-5 sm:px-10 lg:justify-end">
          <span className="text-sm font-semibold tracking-wide text-[color:var(--color-primary)] lg:hidden">
            {t("appName")}
          </span>
          <LocaleSwitcher variant="compact" />
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-10">
          {children}
        </div>
      </section>
    </div>
  );
}

function BrandFeature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-md bg-white/15 ring-1 ring-inset ring-white/10">
        {icon}
      </span>
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="mt-0.5 text-white/80">{description}</p>
      </div>
    </li>
  );
}
