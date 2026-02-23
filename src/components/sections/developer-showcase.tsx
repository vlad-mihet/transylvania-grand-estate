"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { getFeaturedDevelopers } from "@/data/developers";
import { Locale } from "@/types/property";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { AccentButton } from "@/components/shared/accent-button";
import { Building2, ArrowRight } from "lucide-react";

export function DeveloperShowcase() {
  const t = useTranslations("HomePage.developers");
  const locale = useLocale() as Locale;
  const developers = getFeaturedDevelopers();

  return (
    <section className="section-padding bg-[#101014]">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {developers.slice(0, 3).map((developer, index) => (
            <ScrollReveal key={developer.id} delay={index * 100}>
              <Link href={`/properties?developer=${developer.slug}`}>
                <div className="frosted-glass p-6 h-full hover:border-copper/20 transition-all duration-300 group">
                  <div className="relative w-full h-28 rounded-xl overflow-hidden mb-4 bg-white/5">
                    <Image
                      src={developer.logo}
                      alt={developer.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <h3 className="font-serif text-lg text-cream mb-1 group-hover:text-copper transition-colors">
                    {developer.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-cream-muted mb-3">
                    <Building2 className="h-3.5 w-3.5" />
                    {developer.city} &middot; {developer.projectCount} projects
                  </div>
                  <p className="text-cream-muted text-sm leading-relaxed line-clamp-2">
                    {developer.shortDescription[locale]}
                  </p>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
        <div className="mt-8 text-center">
          <AccentButton accentVariant="outline" asChild>
            <Link href="/developers" className="inline-flex items-center gap-2">
              {t("viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </AccentButton>
        </div>
      </Container>
    </section>
  );
}
