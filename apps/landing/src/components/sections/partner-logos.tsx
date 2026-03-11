"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { Developer } from "@tge/types";
import { Container } from "@/components/layout/container";
import { ScrollReveal } from "@tge/ui";
import { ArrowRight } from "lucide-react";

interface PartnerLogosProps {
  developers: Developer[];
}

export function PartnerLogos({ developers }: PartnerLogosProps) {
  const t = useTranslations("TransylvaniaPage.partners");

  return (
    <section className="py-16 md:py-24 bg-[#101014]">
      <Container>
        <ScrollReveal>
          <p className="text-copper uppercase tracking-[0.25em] text-sm font-medium text-center mb-12 md:mb-16">
            {t("subtitle")}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
            {developers.map((developer) => (
              <Link
                key={developer.id}
                href={`/developers/${developer.slug}`}
                className="relative h-8 md:h-10 w-24 md:w-32 logo-grayscale hover:logo-grayscale shrink-0"
              >
                <Image
                  src={developer.logo}
                  alt={developer.name}
                  fill
                  className="object-contain"
                  sizes="128px"
                />
              </Link>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="mt-12 text-center">
            <Link
              href="/developers"
              className="text-cream-muted hover:text-copper text-sm tracking-wide inline-flex items-center gap-2 transition-colors"
            >
              {t("explore")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
