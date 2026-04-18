"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { AccentButton } from "@tge/ui";
import { ScrollReveal } from "@tge/ui";
import { InquiryTrigger } from "@tge/ui";

export function ClosingInvitation() {
  const t = useTranslations("TransylvaniaPage.closing");

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <Image
        src="/images/nature/mountain-valley.jpg"
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
        aria-hidden
      />

      {/* Overlays */}
      <div className="absolute inset-0 bg-black/65 z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80 z-[1]" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 py-24">
        <ScrollReveal>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-cream mb-6 leading-tight">
            {t("headline")}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="h-px w-16 bg-copper mx-auto mb-8" />
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <p className="text-cream-muted text-lg mb-10 max-w-lg mx-auto">
            {t("subline")}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={400}>
          <InquiryTrigger context={{ type: "general" }}>
            <AccentButton size="lg">{t("cta")}</AccentButton>
          </InquiryTrigger>
        </ScrollReveal>

        <ScrollReveal delay={500}>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-cream-muted/40 text-xs tracking-[0.15em]">
            <span>+40 264 123 456</span>
            <span className="hidden sm:inline">&middot;</span>
            <span>contact@tge.ro</span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
