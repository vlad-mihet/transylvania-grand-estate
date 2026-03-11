"use client";

import { useState } from "react";
import Image from "next/image";
import { AccentButton } from "@tge/ui";
import { Link } from "@tge/i18n/navigation";

interface VideoHeroSectionProps {
  videoSrc: string;
  posterImage?: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
}

export function VideoHeroSection({
  videoSrc,
  posterImage,
  title,
  subtitle,
  ctaText,
  ctaHref,
}: VideoHeroSectionProps) {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section className="relative overflow-hidden h-[80vh]">
      {/* Fallback image background */}
      {posterImage && (
        <Image
          src={posterImage}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      )}

      {/* Video background (overlays image when available) */}
      {!videoFailed && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      <div className="absolute inset-0 bg-black/50 z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-[1]" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        {subtitle && (
          <p className="text-copper uppercase tracking-[0.25em] text-sm md:text-base mb-5 animate-fade-in">
            {subtitle}
          </p>
        )}
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-cream max-w-4xl leading-tight animate-slide-up">
          {title}
        </h1>
        {ctaText && ctaHref && (
          <div className="mt-8 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <AccentButton size="lg" asChild>
              <Link href={ctaHref}>{ctaText}</Link>
            </AccentButton>
          </div>
        )}
      </div>
    </section>
  );
}
