"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { Container } from "@/components/layout/container";
import { AccentButton } from "@tge/ui";
import { ScrollReveal } from "@tge/ui";

export function AboutPreview() {
  const t = useTranslations("HomePage.about");

  return (
    <section className="section-padding bg-[#101014]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <ScrollReveal direction="left">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <Image
                src="/images/interiors/villa-exterior.jpg"
                alt="Luxury property"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/20 to-transparent" />
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right" delay={200}>
            <div>
              <p className="text-copper uppercase tracking-[0.2em] text-sm font-medium mb-3">
                {t("subtitle")}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-cream mb-6">
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
