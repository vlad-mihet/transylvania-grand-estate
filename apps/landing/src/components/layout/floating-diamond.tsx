"use client";

import { useEffect, useRef, useState } from "react";

function DiamondSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="diamond-gradient" x1="12" y1="22" x2="12" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-amethyst-deep)" />
          <stop offset="50%" stopColor="var(--color-amethyst)" />
          <stop offset="100%" stopColor="var(--color-amethyst-light)" />
        </linearGradient>
        <linearGradient id="diamond-fill" x1="12" y1="22" x2="12" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-amethyst-deep)" stopOpacity="0.25" />
          <stop offset="50%" stopColor="var(--color-amethyst)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--color-amethyst-light)" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="diamond-facet" x1="12" y1="22" x2="12" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-amethyst-light)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--color-amethyst-light)" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* Diamond body — translucent gradient fill */}
      <path
        d="M12 2L2 9.5L12 22L22 9.5L12 2Z"
        fill="url(#diamond-fill)"
      />
      {/* Outer diamond shape */}
      <path
        d="M12 2L2 9.5L12 22L22 9.5L12 2Z"
        stroke="url(#diamond-gradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Crown line */}
      <path
        d="M2 9.5H22"
        stroke="url(#diamond-gradient)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Facet lines */}
      <path
        d="M12 2L8.5 9.5L12 22"
        stroke="url(#diamond-facet)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2L15.5 9.5L12 22"
        stroke="url(#diamond-facet)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

export function FloatingDiamond() {
  const elementRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const initialLeftRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const prefersReduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(prefersReduced);

    // Read left position after paint to ensure CSS class is applied
    requestAnimationFrame(() => {
      if (elementRef.current) {
        initialLeftRef.current = elementRef.current.getBoundingClientRect().left;
      }
    });

    const handleResize = () => {
      if (elementRef.current) {
        initialLeftRef.current = elementRef.current.getBoundingClientRect().left;
      }
    };

    window.addEventListener("resize", handleResize);
    const timer = setTimeout(() => setMounted(true), 300);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let ticking = false;
    let firstScroll = true;

    const update = () => {
      if (!elementRef.current) return;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // --- Normal floating values ---
      const floatY = Math.min(y * 0.06, vh - 80);
      const floatX = Math.sin(y * 0.0015) * 10;
      const floatRotation = y * 0.008 + Math.sin(y * 0.003) * 5;
      const floatOpacity = Math.min(0.5 + y * 0.0004, 0.9);
      const floatScale = 0.64;

      // --- CTA arrival detection ---
      const ctaEl = document.getElementById("cta-section");
      let progress = 0;

      if (ctaEl) {
        // Use document position for gradual transition over long scroll distance
        const ctaOffsetTop = ctaEl.offsetTop;
        const transitionStart = ctaOffsetTop - vh * 2;
        const transitionEnd = ctaOffsetTop - vh * 0.3;
        progress = Math.max(0, Math.min(1, (y - transitionStart) / (transitionEnd - transitionStart)));
      }

      const eased = smoothstep(progress);

      // --- Arrived target values ---
      const initialLeft = initialLeftRef.current || 40;
      const iconHalf = 22; // half of w-11 (44px)
      const arrivedX = vw / 2 - initialLeft - iconHalf;
      const arrivedY = ctaEl
        ? ctaEl.getBoundingClientRect().top + 50 - 52
        : floatY;
      const arrivedRotation = 0;
      const arrivedScale = 1;
      const arrivedOpacity = 1;

      // --- Lerp between floating and arrived ---
      const finalX = lerp(floatX, arrivedX, eased);
      const finalY = lerp(floatY, arrivedY, eased);
      const finalRotation = lerp(floatRotation, arrivedRotation, eased);
      const finalScale = lerp(floatScale, arrivedScale, eased);
      const finalOpacity = lerp(floatOpacity, arrivedOpacity, eased);

      if (firstScroll) {
        elementRef.current.style.transition = "none";
        firstScroll = false;
      }

      elementRef.current.style.transform = `translate(${finalX}px, ${finalY}px) rotate(${finalRotation}deg) scale(${finalScale})`;
      elementRef.current.style.opacity = String(finalOpacity);

      // Update CTA section glow
      if (ctaEl) {
        ctaEl.style.setProperty("--diamond-glow-opacity", String(eased));
      }

      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      rafRef.current = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={elementRef}
      className="floating-diamond fixed z-[51] pointer-events-none hidden xl:block"
      style={{
        opacity: mounted ? (reducedMotion ? 0.7 : 0.5) : 0,
        transition: "opacity 1s var(--ease-luxury)",
        willChange: "transform, opacity",
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -m-2 rounded-full animate-diamond-glow bg-amethyst/20 blur-md" />
      <DiamondSvg className="relative w-11 h-11" />
    </div>
  );
}
