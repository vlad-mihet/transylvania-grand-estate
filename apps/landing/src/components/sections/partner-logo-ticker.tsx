"use client";

import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { Developer } from "@tge/types";

interface PartnerLogoTickerProps {
  developers: Developer[];
}

export function PartnerLogoTicker({ developers }: PartnerLogoTickerProps) {
  const t = useTranslations("HomePage.partnerTicker");

  if (developers.length === 0) return null;

  // Ensure enough items for a smooth loop — at least 8 before doubling
  const baseItems =
    developers.length < 4
      ? [...developers, ...developers, ...developers]
      : developers;
  const marqueeItems = [...baseItems, ...baseItems];

  // Scale duration so scroll speed per name stays consistent
  const duration = baseItems.length * 5;

  return (
    <section
      className="relative py-6 md:py-8 bg-[#101014]"
      aria-label={t("label")}
    >
      {/* Top gradient blend from hero */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amethyst-deep/20 to-transparent" />

      <div className="overflow-hidden marquee-fade-edges">
        <div
          className="flex items-center w-max animate-marquee-scroll hover:[animation-play-state:paused] motion-reduce:[animation:none]"
          style={{ animationDuration: `${duration}s` }}
          role="marquee"
        >
          {marqueeItems.map((developer, index) => (
            <div key={`${developer.id}-${index}`} className="flex items-center shrink-0">
              {index > 0 && (
                <span className="text-amethyst-deep/30 text-xs mx-6 md:mx-10 select-none">
                  ◆
                </span>
              )}
              <Link
                href={`/developers/${developer.slug}`}
                className="font-[family-name:var(--font-montserrat)] font-semibold text-sm md:text-base lg:text-lg text-amethyst/60 uppercase tracking-[0.2em] whitespace-nowrap transition-colors duration-500 hover:text-amethyst-light"
              >
                {developer.name}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amethyst-deep/20 to-transparent" />
    </section>
  );
}
