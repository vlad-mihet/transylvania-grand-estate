"use client";

import { useTranslations, useLocale } from "next-intl";
import { siteConfig } from "@/data/site-config";
import { Locale } from "@/types/property";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export function OfficeLocations() {
  const t = useTranslations("ContactPage.offices");
  const locale = useLocale() as Locale;

  return (
    <section className="section-padding bg-background">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {siteConfig.offices.map((office, index) => (
            <ScrollReveal key={office.city} delay={index * 100}>
              <div className="frosted-glass p-6 h-full">
                <h3 className="font-serif text-xl text-cream mb-4">
                  {office.city}
                </h3>
                <div className="space-y-3 text-sm text-cream-muted">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-copper mt-0.5 flex-shrink-0" />
                    <span>{office.address[locale]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-copper flex-shrink-0" />
                    <a
                      href={`tel:${office.phone}`}
                      className="hover:text-copper transition-colors"
                    >
                      {office.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-copper flex-shrink-0" />
                    <a
                      href={`mailto:${office.email}`}
                      className="hover:text-copper transition-colors"
                    >
                      {office.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-copper flex-shrink-0" />
                    <span>{office.hours[locale]}</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
