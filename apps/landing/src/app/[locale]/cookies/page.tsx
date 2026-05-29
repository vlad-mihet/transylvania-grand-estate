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
    <main className="container mx-auto max-w-3xl px-6 pt-40 pb-20">
      <p className="text-xs uppercase tracking-[0.2em] text-cream-muted mb-4">
        {t("lastUpdatedLabel")} {t("lastUpdated")}
      </p>
      <h1 className="font-serif text-4xl md:text-5xl text-cream mb-6">
        {t("title")}
      </h1>
      <p className="text-cream-muted text-lg leading-relaxed mb-12">
        {t("intro")}
      </p>

      <section className="space-y-8 text-cream-muted leading-relaxed">
        {SECTIONS.map((key) => (
          <article key={key}>
            <h2 className="font-serif text-2xl text-cream mb-3">
              {t(`sections.${key}.title`)}
            </h2>
            <p>{t(`sections.${key}.body`)}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
