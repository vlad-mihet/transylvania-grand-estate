"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { SectionHeading, ScrollReveal } from "@tge/ui";
import { MapPin, Phone, Mail } from "lucide-react";
import { CONTACT_PHONE } from "@/lib/contact";

const CONTACT_EMAIL = "contact@transylvaniagrandestate.ro";

export function ContactOffice() {
  const t = useTranslations("ContactPage.office");

  return (
    <section className="section-padding bg-background">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="max-w-md mx-auto">
          <ScrollReveal>
            <div className="frosted-glass p-6">
              <div className="space-y-4 text-sm text-cream-muted">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-copper mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-serif text-lg text-cream leading-tight">
                      Cluj-Napoca
                    </p>
                    <p>Cluj, România</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-copper flex-shrink-0" />
                  <a
                    href={`tel:${CONTACT_PHONE.tel}`}
                    className="hover:text-copper transition-colors"
                  >
                    {CONTACT_PHONE.display}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-copper flex-shrink-0" />
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="hover:text-copper transition-colors"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
