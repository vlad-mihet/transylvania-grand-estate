"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";
import { useParallax } from "@tge/hooks";
import { Container } from "@/components/layout/container";
import { SectionHeading, ScrollReveal } from "@tge/ui";

interface Landmark {
  name: string;
  tagline: string;
  location: string;
  image: string;
  unescoSite?: boolean;
}

interface LandmarkPair {
  id: string;
  romanNumeral: string;
  themeTitle: string;
  primary: Landmark;
  secondary: Landmark;
}

interface IconicLandmarksProps {
  pairs: LandmarkPair[];
}

function LandmarkImage({
  landmark,
  size,
  parallax,
}: {
  landmark: Landmark;
  size: "primary" | "secondary";
  parallax?: number;
}) {
  const aspectClass =
    size === "primary" ? "aspect-[3/4]" : "aspect-square";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl group",
        aspectClass
      )}
    >
      <div
        className="absolute inset-0 scale-105"
        style={
          parallax !== undefined
            ? { transform: `translateY(${parallax}px) scale(1.05)` }
            : undefined
        }
      >
        <Image
          src={landmark.image}
          alt={landmark.name}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-103"
          sizes={
            size === "primary"
              ? "(max-width: 768px) 100vw, 66vw"
              : "(max-width: 768px) 100vw, 33vw"
          }
        />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* UNESCO badge */}
      {landmark.unescoSite && (
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
          <span className="text-copper/50 text-[0.65rem] uppercase tracking-[0.3em] font-light">
            UNESCO
          </span>
        </div>
      )}

      {/* Hover glow border */}
      <div className="absolute inset-0 rounded-2xl border-2 border-copper/0 group-hover:border-copper/15 transition-colors duration-700 pointer-events-none" />
    </div>
  );
}

function LandmarkInfoCard({ pair }: { pair: LandmarkPair }) {
  return (
    <div className="frosted-glass p-6 md:p-8">
      {/* Roman numeral + theme */}
      <div className="mb-5">
        <span className="text-copper/40 font-serif text-sm">
          {pair.romanNumeral}
        </span>
        <h3 className="font-serif text-2xl md:text-3xl text-cream mt-1">
          {pair.themeTitle}
        </h3>
      </div>

      <div className="h-px w-12 bg-copper mb-5" />

      {/* Primary landmark */}
      <div className="group/landmark mb-4">
        <p className="font-serif text-lg text-cream transition-colors duration-500 group-hover/landmark:text-copper-light">
          {pair.primary.name}
        </p>
        <p className="text-cream-muted/60 text-sm italic mt-1 transition-opacity duration-500 group-hover/landmark:opacity-100">
          {pair.primary.tagline}
        </p>
        <p className="text-copper/60 text-xs tracking-wide mt-1">
          {pair.primary.location}
        </p>
      </div>

      {/* Divider between landmarks */}
      <div className="h-px w-8 bg-copper/20 mb-4" />

      {/* Secondary landmark */}
      <div className="group/landmark">
        <p className="font-serif text-lg text-cream transition-colors duration-500 group-hover/landmark:text-copper-light">
          {pair.secondary.name}
        </p>
        <p className="text-cream-muted/60 text-sm italic mt-1 transition-opacity duration-500 group-hover/landmark:opacity-100">
          {pair.secondary.tagline}
        </p>
        <p className="text-copper/60 text-xs tracking-wide mt-1">
          {pair.secondary.location}
        </p>
      </div>
    </div>
  );
}

function LandmarkDiptych({
  pair,
  index,
}: {
  pair: LandmarkPair;
  index: number;
}) {
  const isOdd = index % 2 === 0; // 0-indexed: first pair is "odd" (primary left)
  const { ref, offset } = useParallax({ speed: 0.1 });

  const primaryDirection = isOdd ? "left" : "right";
  const secondaryDirection = isOdd ? "right" : "left";

  return (
    <div ref={ref}>
      {/* Desktop layout */}
      <div
        className={cn(
          "hidden md:grid grid-cols-12 gap-4 lg:gap-6 items-end",
          !isOdd && "direction-rtl"
        )}
        style={!isOdd ? { direction: "rtl" } : undefined}
      >
        {/* Primary image — col-span-8 */}
        <ScrollReveal
          direction={primaryDirection}
          className="col-span-8 relative"
        >
          <div style={!isOdd ? { direction: "ltr" } : undefined}>
            <LandmarkImage
              landmark={pair.primary}
              size="primary"
              parallax={offset}
            />
          </div>
        </ScrollReveal>

        {/* Secondary image + overlapping info card — col-span-4 */}
        <div
          className="col-span-4 relative"
          style={!isOdd ? { direction: "ltr" } : undefined}
        >
          <ScrollReveal direction={secondaryDirection} delay={150}>
            <LandmarkImage landmark={pair.secondary} size="secondary" />
          </ScrollReveal>

          {/* Info card overlapping between images */}
          <ScrollReveal direction="up" delay={300}>
            <div
              className={cn(
                "mt-6"
              )}
            >
              <LandmarkInfoCard pair={pair} />
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Mobile layout — stacked */}
      <div className="md:hidden space-y-4">
        <ScrollReveal direction="up">
          <LandmarkImage landmark={pair.primary} size="primary" />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={150}>
          <LandmarkInfoCard pair={pair} />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={300}>
          <LandmarkImage landmark={pair.secondary} size="secondary" />
        </ScrollReveal>
      </div>
    </div>
  );
}

function PairSeparator() {
  return (
    <div className="flex justify-center">
      <span className="text-copper/20 text-xs select-none">●</span>
    </div>
  );
}

export function IconicLandmarks({ pairs }: IconicLandmarksProps) {
  const t = useTranslations("TransylvaniaPage.landmarks");

  return (
    <section className="section-padding bg-background">
      <Container>
        <SectionHeading
          title={t("title")}
          subtitle={t("subtitle")}
          alignment="center"
        />

        <div className="flex flex-col gap-20 lg:gap-32">
          {pairs.map((pair, index) => (
            <div key={pair.id}>
              <LandmarkDiptych pair={pair} index={index} />
              {index < pairs.length - 1 && (
                <div className="mt-20 lg:mt-32">
                  <PairSeparator />
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
