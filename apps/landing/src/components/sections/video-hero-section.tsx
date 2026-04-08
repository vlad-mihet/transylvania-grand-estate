"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { Volume2, VolumeX, ChevronDown } from "lucide-react";
import { AccentButton } from "@tge/ui";
import { Link } from "@tge/i18n/navigation";

interface VideoHeroSectionProps {
  videoSrc: string;
  posterImage?: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  enableSound?: boolean;
  fullHeight?: boolean;
  showScrollIndicator?: boolean;
}

export function VideoHeroSection({
  videoSrc,
  posterImage,
  title,
  subtitle,
  ctaText,
  ctaHref,
  enableSound = false,
  fullHeight = false,
  showScrollIndicator = false,
}: VideoHeroSectionProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const attemptPlayback = async () => {
      if (enableSound) {
        // Try unmuted playback first
        video.muted = false;
        try {
          await video.play();
          setIsMuted(false);
          return;
        } catch {
          // Browser blocked unmuted — fall back to muted
        }
      }

      // Muted playback (always works)
      video.muted = true;
      setIsMuted(true);
      video.play().catch(() => {});
    };

    attemptPlayback();
  }, [enableSound]);

  const scrollToContent = useCallback(() => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  }, []);

  return (
    <section
      className={`relative overflow-hidden ${fullHeight ? "h-dvh" : "h-[80vh]"}`}
    >
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
          ref={videoRef}
          loop
          playsInline
          preload="auto"
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-black/50 z-[1]" />
      <div className="absolute inset-0 vignette-radial z-[1]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent z-[1]" />

      {/* Content */}
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
          <div
            className="mt-8 animate-slide-up"
            style={{ animationDelay: "200ms" }}
          >
            <AccentButton size="lg" asChild>
              <Link href={ctaHref}>{ctaText}</Link>
            </AccentButton>
          </div>
        )}
      </div>

      {/* Sound toggle */}
      {enableSound && (
        <button
          onClick={toggleMute}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 flex items-center justify-center rounded-full border border-cream/20 bg-black/30 backdrop-blur-sm text-cream/70 hover:text-cream hover:border-cream/40 transition-colors duration-500 cursor-pointer"
          style={{ transitionTimingFunction: "var(--ease-luxury)" }}
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Scroll indicator */}
      {showScrollIndicator && (
        <button
          onClick={scrollToContent}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-cream/50 hover:text-cream transition-colors cursor-pointer"
          aria-label="Scroll down"
        >
          <ChevronDown className="w-6 h-6 animate-pulse-down" />
        </button>
      )}
    </section>
  );
}
