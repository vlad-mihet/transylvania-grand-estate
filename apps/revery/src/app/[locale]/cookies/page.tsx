import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CookiePolicy");
  return {
    title: t("title"),
    description: t("intro"),
  };
}

const SECTIONS = ["what", "essential", "control", "changes", "contact"] as const;

export default async function CookiesPage() {
  const t = await getTranslations("CookiePolicy");

  return (
    <main className="container mx-auto max-w-3xl px-6 py-16 md:py-20">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4 font-medium">
        {t("lastUpdatedLabel")} {t("lastUpdated")}
      </p>
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
        {t("title")}
      </h1>
      <p className="text-muted-foreground text-lg leading-relaxed mb-12">
        {t("intro")}
      </p>

      <section className="space-y-8 text-muted-foreground leading-relaxed">
        {SECTIONS.map((key) => (
          <article key={key}>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              {t(`sections.${key}.title`)}
            </h2>
            <p>{t(`sections.${key}.body`)}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
