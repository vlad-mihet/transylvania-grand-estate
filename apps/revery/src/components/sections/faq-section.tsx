"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@tge/ui";
import { Container } from "@/components/layout/container";

const FAQ_COUNT = 6;

export function FAQSection() {
  const t = useTranslations("HomePage.faq");

  return (
    <section className="py-12 sm:py-14 md:py-20">
      <Container>
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{t("title")}</h2>
          <Link
            href="/faq"
            className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
          >
            {t("viewAll")}
          </Link>
        </div>
        <Accordion type="single" collapsible>
          {Array.from({ length: FAQ_COUNT }, (_, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-[15px]">
                {t(`items.${i}.question`)}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {t(`items.${i}.answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
}
