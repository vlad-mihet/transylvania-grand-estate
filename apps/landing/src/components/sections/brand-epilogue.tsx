"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { Container } from "@/components/layout/container";
import { AccentButton, ScrollReveal } from "@tge/ui";

export function BrandEpilogue() {
  const t = useTranslations("TransylvaniaPage.brand");

  return (
    <section className="section-padding bg-[#101014]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-center">
          {/* Image — 60% */}
          <ScrollReveal direction="left" className="lg:col-span-3">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden">
              <Image
                src="/images/interiors/luxury-living.jpg"
                alt="Luxury estate interior"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#101014]/30 to-transparent" />
            </div>
          </ScrollReveal>

          {/* Text — 40% */}
          <ScrollReveal direction="right" delay={200} className="lg:col-span-2">
            <div>
              <p className="text-copper uppercase tracking-[0.2em] text-sm font-medium mb-4">
                {t("label")}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-cream mb-6 leading-tight">
                {t("title")}
              </h2>
              <p className="text-cream-muted leading-relaxed text-lg mb-8">
                {t("description")}
              </p>
              <AccentButton accentVariant="outline" asChild>
                <Link href="/about">{t("cta")}</Link>
              </AccentButton>
            </div>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
}
