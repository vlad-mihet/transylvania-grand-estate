"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

interface SplashOverlayProps {
  videoSrc: string;
  /** Called immediately on click (within user gesture) — use to unmute video */
  onClickEnter: () => void;
  /** Called after fade-out completes — use to reveal hero content */
  onFadeComplete: () => void;
}

export function SplashOverlay({ videoSrc, onClickEnter, onFadeComplete }: SplashOverlayProps) {
  const t = useTranslations("SplashOverlay");
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Entrance: lock scroll + trigger entrance animations after mount
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
    };
  }, []);

  const handleEnter = () => {
    onClickEnter();
    setExiting(true);
  };

  const handleTransitionEnd = useCallback((e: React.TransitionEvent) => {
    // Only respond to the parent div's own opacity transition, not bubbled child transitions
    if (e.target !== e.currentTarget || e.propertyName !== "opacity") return;
    if (exiting) {
      document.body.style.overflow = "";
      onFadeComplete();
    }
  }, [exiting, onFadeComplete]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{
        opacity: exiting ? 0 : 1,
        transition: "opacity 1s var(--ease-luxury)",
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      {/* Background — paused video showing first frame */}
      <video
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Dark overlay + vignette */}
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 vignette-radial" />

      {/* Decorative top line */}
      <div
        className="absolute top-[38%] left-1/2 -translate-x-1/2 h-px bg-copper/20"
        style={{
          width: mounted ? 120 : 0,
          transition: "width 1.2s var(--ease-luxury)",
          transitionDelay: "200ms",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <p
          className="text-copper/70 uppercase tracking-[0.35em] text-[10px] sm:text-xs mb-6"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.8s var(--ease-luxury), transform 0.8s var(--ease-luxury)",
            transitionDelay: "100ms",
          }}
        >
          {t("tagline")}
        </p>

        <h1
          className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-cream leading-tight"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 1s var(--ease-luxury), transform 1s var(--ease-luxury)",
            transitionDelay: "300ms",
          }}
        >
          Transylvania
          <br />
          <span className="text-copper">Grand Estate</span>
        </h1>

        {/* Decorative bottom line */}
        <div
          className="mt-8 h-px bg-copper/20"
          style={{
            width: mounted ? 60 : 0,
            transition: "width 1s var(--ease-luxury)",
            transitionDelay: "600ms",
          }}
        />

        <button
          onClick={handleEnter}
          className="mt-10 group cursor-pointer"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.8s var(--ease-luxury), transform 0.8s var(--ease-luxury)",
            transitionDelay: "800ms",
          }}
        >
          <span className="inline-block px-10 py-3 text-xs uppercase tracking-[0.3em] text-cream/80 border border-cream/15 rounded-none backdrop-blur-sm transition-all duration-700 group-hover:text-cream group-hover:border-copper/40 group-hover:shadow-[0_0_30px_-8px_rgba(196,127,90,0.25)]"
            style={{ transitionTimingFunction: "var(--ease-luxury)" }}
          >
            {t("enter")}
          </span>
        </button>
      </div>
    </div>
  );
}
