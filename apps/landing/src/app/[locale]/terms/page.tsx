import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TermsOfService");
  return {
    title: t("title"),
    description: t("intro"),
  };
}

const SECTIONS = [
  "acceptance",
  "use",
  "listings",
  "intermediary",
  "ip",
  "liability",
  "thirdParty",
  "privacy",
  "changes",
  "law",
  "contact",
] as const;

export default async function TermsPage() {
  const t = await getTranslations("TermsOfService");

  return (
    <main className="container mx-auto max-w-3xl px-6 py-20">
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
