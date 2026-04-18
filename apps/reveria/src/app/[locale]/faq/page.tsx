import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { CTABanner } from "@/components/sections/cta-banner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@tge/ui";

const FAQ_COUNT = 10;

export async function generateMetadata() {
  const t = await getTranslations("FAQPage");
  return { title: t("hero.title"), description: t("hero.subtitle") };
}

export default async function FAQPage() {
  const t = await getTranslations("FAQPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");

  return (
    <>
      <PageHeader
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        breadcrumbItems={[
          { label: tBreadcrumb("home"), href: "/" },
          { label: tBreadcrumb("faq") },
        ]}
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
