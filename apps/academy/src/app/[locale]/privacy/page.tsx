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
 * Placeholder privacy page mirroring landing/revery. Wired as the GDPR
 * consent checkbox link target on the support form.
 */
export default async function PrivacyPage() {
  const t = await getTranslations("PrivacyPolicy");

  return (
    <main className="container mx-auto max-w-3xl px-6 py-16 md:py-20">
      <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {t("lastUpdatedLabel")} {t("lastUpdated")}
      </p>
      <h1 className="mb-6 text-3xl font-bold text-foreground md:text-4xl">
        {t("title")}
      </h1>
      <p className="mb-12 text-lg leading-relaxed text-muted-foreground">
        {t("intro")}
      </p>

      <section className="space-y-8 leading-relaxed text-muted-foreground">
        <article>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            {t("sections.collect.title")}
          </h2>
          <p>{t("sections.collect.body")}</p>
        </article>

        <article>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            {t("sections.use.title")}
          </h2>
          <p>{t("sections.use.body")}</p>
        </article>

        <article>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            {t("sections.retention.title")}
          </h2>
          <p>{t("sections.retention.body")}</p>
        </article>

        <article>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            {t("sections.rights.title")}
          </h2>
          <p>{t("sections.rights.body")}</p>
        </article>

        <article>
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            {t("sections.contact.title")}
          </h2>
          <p>{t("sections.contact.body")}</p>
        </article>
      </section>
    </main>
  );
}
