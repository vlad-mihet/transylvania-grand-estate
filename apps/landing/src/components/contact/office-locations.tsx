"use client";

import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@tge/ui";
import { ScrollReveal } from "@tge/ui";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const offices = [
  {
    city: "Cluj-Napoca",
    address: {
      en: "21 Eroilor Boulevard, Cluj-Napoca 400129, Cluj County",
      ro: "Bulevardul Eroilor 21, Cluj-Napoca 400129, Judetul Cluj",
      fr: "Boulevard Eroilor 21, Cluj-Napoca 400129, Département de Cluj",
      de: "Eroilor Boulevard 21, Cluj-Napoca 400129, Kreis Cluj",
    },
    phone: "+40 264 123 456",
    email: "cluj@tge.ro",
    hours: {
      en: "Mon-Fri: 9:00 - 18:00 | Sat: 10:00 - 14:00",
      ro: "Lun-Vin: 9:00 - 18:00 | Sâm: 10:00 - 14:00",
      fr: "Lun-Ven : 9h00 - 18h00 | Sam : 10h00 - 14h00",
      de: "Mo-Fr: 9:00 - 18:00 | Sa: 10:00 - 14:00",
    },
  },
  {
    city: "Brasov",
    address: {
      en: "15 Republicii Street, Brasov 500030, Brasov County",
      ro: "Strada Republicii 15, Brasov 500030, Judetul Brasov",
      fr: "Rue Republicii 15, Brasov 500030, Département de Brasov",
      de: "Republicii Straße 15, Brasov 500030, Kreis Brasov",
    },
    phone: "+40 268 123 456",
    email: "brasov@tge.ro",
    hours: {
      en: "Mon-Fri: 9:00 - 18:00 | Sat: 10:00 - 14:00",
      ro: "Lun-Vin: 9:00 - 18:00 | Sâm: 10:00 - 14:00",
      fr: "Lun-Ven : 9h00 - 18h00 | Sam : 10h00 - 14h00",
      de: "Mo-Fr: 9:00 - 18:00 | Sa: 10:00 - 14:00",
    },
  },
  {
    city: "Timisoara",
    address: {
      en: "8 Victoriei Square, Timisoara 300006, Timis County",
      ro: "Piata Victoriei 8, Timisoara 300006, Judetul Timis",
      fr: "Place Victoriei 8, Timisoara 300006, Département de Timis",
      de: "Victoriei Platz 8, Timisoara 300006, Kreis Timis",
    },
    phone: "+40 256 123 456",
    email: "timisoara@tge.ro",
    hours: {
      en: "Mon-Fri: 9:00 - 18:00 | Sat: 10:00 - 14:00",
      ro: "Lun-Vin: 9:00 - 18:00 | Sâm: 10:00 - 14:00",
      fr: "Lun-Ven : 9h00 - 18h00 | Sam : 10h00 - 14h00",
      de: "Mo-Fr: 9:00 - 18:00 | Sa: 10:00 - 14:00",
    },
  },
];

export function OfficeLocations() {
  const t = useTranslations("ContactPage.offices");
  const locale = useLocale();

  return (
    <section className="section-padding bg-background">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {offices.map((office, index) => (
            <ScrollReveal key={office.city} delay={index * 100}>
              <div className="frosted-glass p-6 h-full">
                <h3 className="font-serif text-xl text-cream mb-4">
                  {office.city}
                </h3>
                <div className="space-y-3 text-sm text-cream-muted">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-copper mt-0.5 flex-shrink-0" />
                    <span>{(office.address as Record<string, string>)[locale] ?? office.address.en}</span>
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
                    <span>{(office.hours as Record<string, string>)[locale] ?? office.hours.en}</span>
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
