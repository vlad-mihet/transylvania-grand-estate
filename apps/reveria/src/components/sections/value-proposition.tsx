"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/layout/container";
import { ArrowRight } from "lucide-react";

const features = [
  {
    key: "approach" as const,
    href: "/properties" as const,
    image:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
  },
  {
    key: "curated" as const,
    href: { pathname: "/properties" as const, query: { featured: "true" } },
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  },
  {
    key: "guidance" as const,
    href: "/contact" as const,
    image:
      "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80",
  },
];

export function ValueProposition() {
  const t = useTranslations("HomePage.valueProposition");

  return (
    <section className="py-12 sm:py-16 md:py-24">
      <Container>
        {/* Section header */}
        <div className="max-w-xl mb-10 sm:mb-14 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t("title")}
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Feature rows */}
        <div className="space-y-16 md:space-y-24">
          {features.map((feature, index) => {
            const imageFirst = index % 2 === 0;

            return (
              <div
                key={feature.key}
                className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
              >
                {/* Image */}
                <div
                  className={imageFirst ? "lg:order-1" : "lg:order-2"}
                >
                  <div className="relative aspect-[3/2] rounded-2xl overflow-hidden">
                    <Image
                      src={feature.image}
                      alt={t(`features.${feature.key}.title`)}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>
                </div>

                {/* Text */}
                <div
                  className={imageFirst ? "lg:order-2" : "lg:order-1"}
                >
                  <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
                    {t(`features.${feature.key}.title`)}
                  </h3>
                  <p className="text-muted-foreground text-base leading-relaxed mb-6">
                    {t(`features.${feature.key}.description`)}
                  </p>
                  <Link
                    href={feature.href}
                    className="group inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {t(`features.${feature.key}.cta`)}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
