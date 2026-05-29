import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PrivacyPolicy");
  return {
    title: t("title"),
    description: t("intro"),
  };
}

/**
 * Placeholder privacy page. Wired as the link target for the GDPR consent
 * checkbox on every contact form. Legal will replace the body with a full
 * policy; the structure (sections + lastUpdated stamp) stays so the route
 * doesn't churn each time the policy text is revised.
 */
export default async function PrivacyPage() {
  const t = await getTranslations("PrivacyPolicy");

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
        <article>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {t("sections.collect.title")}
          </h2>
          <p>{t("sections.collect.body")}</p>
        </article>

        <article>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {t("sections.use.title")}
          </h2>
          <p>{t("sections.use.body")}</p>
        </article>

        <article>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {t("sections.processors.title")}
          </h2>
          <p>{t("sections.processors.body")}</p>
        </article>

        <article>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {t("sections.retention.title")}
          </h2>
          <p>{t("sections.retention.body")}</p>
        </article>

        <article>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {t("sections.rights.title")}
          </h2>
          <p>{t("sections.rights.body")}</p>
        </article>

        <article>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {t("sections.contact.title")}
          </h2>
          <p>{t("sections.contact.body")}</p>
        </article>
      </section>
    </main>
  );
}
