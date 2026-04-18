"use client";

import { useState, useRef, useCallback } from "react";
import { SplashOverlay } from "@/components/layout/splash-overlay";
import { VideoHeroSection } from "./video-hero-section";

interface HomeHeroWithSplashProps {
  videoSrc: string;
  posterImage: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
}

// Read once at module eval (still client-only) so we can seed state
// synchronously without an effect. `typeof window` guards SSR, where the
// component renders its initial state before hydration takes over.
const splashAlreadySeen = () =>
  typeof window !== "undefined" &&
  window.sessionStorage.getItem("splash-seen") === "1";

export function HomeHeroWithSplash({
  videoSrc,
  posterImage,
  title,
  subtitle,
  ctaText,
  ctaHref,
}: HomeHeroWithSplashProps) {
  const [splashVisible, setSplashVisible] = useState(() => !splashAlreadySeen());
  const [heroRevealed, setHeroRevealed] = useState(() => splashAlreadySeen());
  const videoUnmuteRef = useRef<(() => void) | null>(null);

  // Called immediately on click (within user gesture) — unmute video
  const handleClickEnter = useCallback(() => {
    videoUnmuteRef.current?.();
  }, []);

  // Called after splash fade-out completes — reveal hero content
  const handleFadeComplete = useCallback(() => {
    sessionStorage.setItem("splash-seen", "1");
    setSplashVisible(false);
    setTimeout(() => setHeroRevealed(true), 100);
  }, []);

  return (
    <>
      {splashVisible && (
        <SplashOverlay
          videoSrc={videoSrc}
          onClickEnter={handleClickEnter}
          onFadeComplete={handleFadeComplete}
        />
      )}
      <VideoHeroSection
        videoSrc={videoSrc}
        posterImage={posterImage}
        title={title}
        subtitle={subtitle}
        ctaText={ctaText}
        ctaHref={ctaHref}
        enableSound
        fullHeight
        showScrollIndicator
        onUnmuteRef={videoUnmuteRef}
        revealed={heroRevealed}
      />
    </>
  );
}
