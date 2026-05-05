import { getTranslations } from "next-intl/server";
import type { Locale } from "@tge/types";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { CTABanner } from "@/components/sections/cta-banner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@tge/ui";
import { createMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageSchema } from "@/lib/jsonld";

const FAQ_COUNT = 10;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FAQPage" });
  return createMetadata({
    title: t("hero.title"),
    description: t("hero.subtitle"),
    path: "/faq",
    locale,
  });
}

export default async function FAQPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("FAQPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");

  const faqItems = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    question: t(`items.${i}.question`),
    answer: t(`items.${i}.answer`),
  }));

  return (
    <>
      <JsonLd schema={faqPageSchema(faqItems)} />
      <PageHeader
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        breadcrumbItems={[
          { label: tBreadcrumb("home"), href: "/" },
          { label: tBreadcrumb("faq") },
        ]}
        locale={locale}
      />

      <section className="pb-16 md:pb-24 bg-background">
        <Container>
          <div className="max-w-3xl mx-auto">
            <div className="bg-card rounded-xl border border-border">
              <Accordion type="single" collapsible className="px-6">
                {Array.from({ length: FAQ_COUNT }, (_, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left">
                      {t(`items.${i}.question`)}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {t(`items.${i}.answer`)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </Container>
      </section>

      <CTABanner
        title={t("cta.title")}
        subtitle={t("cta.subtitle")}
        buttonText={t("cta.button")}
        buttonHref="/contact"
      />
    </>
  );
}
