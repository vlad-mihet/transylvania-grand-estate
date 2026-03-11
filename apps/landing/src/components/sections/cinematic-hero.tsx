"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

interface CinematicHeroProps {
  videoSrc: string;
  posterImage?: string;
  headline: string;
  brandLine: string;
}

export function CinematicHero({
  videoSrc,
  posterImage,
  headline,
  brandLine,
}: CinematicHeroProps) {
  const [stage, setStage] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setStage(4);
      return;
    }

    const timers = [
      setTimeout(() => setStage(1), 800),
      setTimeout(() => setStage(2), 2000),
      setTimeout(() => setStage(3), 2600),
      setTimeout(() => setStage(4), 3000),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <section className="relative h-screen overflow-hidden bg-black">
      {/* Fallback image background */}
      {posterImage && (
        <Image
          src={posterImage}
          alt=""
          fill
          priority
          className="object-cover transition-opacity duration-[1200ms] ease-out"
          style={{ opacity: stage >= 1 ? 1 : 0 }}
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
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-out"
          style={{ opacity: stage >= 1 ? 1 : 0 }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Radial vignette overlay */}
      <div className="absolute inset-0 vignette-radial z-[1]" />

      {/* Bottom gradient for seamless transition */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent z-[1]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        {/* Main headline */}
        <h1
          className="font-serif text-5xl md:text-7xl lg:text-8xl text-cream max-w-5xl leading-[1.1] transition-all duration-[800ms] ease-out"
          style={{
            opacity: stage >= 2 ? 1 : 0,
            transform: stage >= 2 ? "translateY(0)" : "translateY(30px)",
          }}
        >
          {headline}
        </h1>

        {/* Copper line */}
        <div
          className="h-px bg-copper mt-8 transition-all duration-[800ms]"
          style={{
            width: stage >= 3 ? 80 : 0,
            opacity: stage >= 3 ? 1 : 0,
            transitionTimingFunction: "var(--ease-luxury)",
          }}
        />

        {/* Brand name */}
        <p
          className="text-cream/60 uppercase tracking-[0.3em] text-xs md:text-sm mt-6 transition-all duration-[600ms] ease-out"
          style={{
            opacity: stage >= 4 ? 1 : 0,
            transform: stage >= 4 ? "translateY(0)" : "translateY(10px)",
          }}
        >
          {brandLine}
        </p>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-cream/50 hover:text-cream transition-colors cursor-pointer"
        style={{
          opacity: stage >= 4 ? 1 : 0,
          transition: "opacity 600ms ease-out",
        }}
        aria-label="Scroll down"
      >
        <ChevronDown className="w-6 h-6 animate-pulse-down" />
      </button>
    </section>
  );
}
