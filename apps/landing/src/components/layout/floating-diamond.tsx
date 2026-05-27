"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@tge/i18n/navigation";

export function DiamondSvg({ className }: { className?: string }) {
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

// Seed `reducedMotion` synchronously so the first paint matches the user's
// accessibility preference — avoids flash and the set-state-in-effect anti-
// pattern. SSR-safe: returns false on the server.
const prefersReducedMotionInitial = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Floating diamond bounding box (w-11 = 44px). Centered on the header
// diamond's bounding-box center at rest so the two overlap regardless of
// header-diamond size.
const FLOATING_BOX = 44;

export function FloatingDiamond() {
  const elementRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const initialLeftRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [reducedMotion] = useState(() => prefersReducedMotionInitial());
  const pathname = usePathname();
  const isHomepage = pathname === "/";

  useEffect(() => {
    const syncPosition = () => {
      const headerDiamond = document.getElementById("header-diamond");
      if (headerDiamond && elementRef.current) {
        const rect = headerDiamond.getBoundingClientRect();
        // Center the floating box on the header diamond's center so the two
        // overlap regardless of size differences.
        const headerCenterX = rect.left + rect.width / 2;
        const headerCenterY = rect.top + rect.height / 2;
        elementRef.current.style.left = `${headerCenterX - FLOATING_BOX / 2}px`;
        elementRef.current.style.top = `${headerCenterY - FLOATING_BOX / 2}px`;
        initialLeftRef.current = headerCenterX - FLOATING_BOX / 2;
      } else if (elementRef.current) {
        initialLeftRef.current = elementRef.current.getBoundingClientRect().left;
      }
    };

    // Sync after paint
    requestAnimationFrame(syncPosition);

    window.addEventListener("resize", syncPosition);
    const timer = setTimeout(() => setMounted(true), 300);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", syncPosition);
    };
  }, [pathname]);

  useEffect(() => {
    if (reducedMotion || !isHomepage) return;

    let ticking = false;
    let firstScroll = true;

    const update = () => {
      if (!elementRef.current) return;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // The element's CSS `top` (set below to the header-diamond center). The
      // arrival math translates relative to this anchor, so we capture it to
      // land the diamond at an exact viewport target.
      let elementTop = 0;

      // Re-anchor every frame to the live header-diamond rect. The header is
      // fixed, but its inner layout shifts when the utility bar collapses on
      // scroll (`isScrolled` flips at scrollY > 50), which moves the header
      // diamond's viewport position. Without this, the floating diamond's
      // top/left freeze at mount-time and slip out of overlap as soon as the
      // user scrolls past the threshold.
      const headerDiamond = document.getElementById("header-diamond");
      if (headerDiamond) {
        const rect = headerDiamond.getBoundingClientRect();
        const headerCenterX = rect.left + rect.width / 2;
        const headerCenterY = rect.top + rect.height / 2;
        elementRef.current.style.left = `${headerCenterX - FLOATING_BOX / 2}px`;
        elementRef.current.style.top = `${headerCenterY - FLOATING_BOX / 2}px`;
        initialLeftRef.current = headerCenterX - FLOATING_BOX / 2;
        elementTop = headerCenterY - FLOATING_BOX / 2;
      }

      // --- Normal floating values ---
      const floatY = Math.min(y * 0.06, vh - 80);
      const floatX = Math.sin(y * 0.0015) * 10;
      const floatRotation = y * 0.008 + Math.sin(y * 0.003) * 5;
      // Size/opacity tuned so at scrollY=0 this diamond sits exactly on top
      // of the header diamond (44 * 0.727 = 32, opacity 0.7). Stacking the
      // two makes the homepage read as a single diamond at rest; as the page
      // scrolls the header one leaves with the document flow and this
      // floating one descends via floatY, producing the "diamant coboară"
      // effect. CTA arrival lerps scale -> 1 and opacity -> 1 below.
      const floatOpacity = 0.7;
      const floatScale = 0.727;

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
      // Land the diamond just above the CTA heading rather than at the
      // section's top edge — the section's pt-28 padding would otherwise leave
      // it stranded ~110px above the title. Target the heading rect directly so
      // the resting gap stays correct regardless of the section's top padding.
      // `- elementTop` converts the viewport-space heading position into a
      // translate offset relative to the element's anchored CSS top.
      const headingEl = ctaEl?.querySelector("h2");
      const GAP_ABOVE_HEADING = 24; // px between diamond bottom and heading top
      const arrivedY = headingEl
        ? headingEl.getBoundingClientRect().top - FLOATING_BOX - GAP_ABOVE_HEADING - elementTop
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

    // Run immediately to set correct position for current scroll offset
    update();

    // The diamond's *position* shifts whenever the header reflows (utility
    // bar h-8↔h-0 on isScrolled, isHidden translate, font/image loads,
    // browser zoom, viewport resize), but its *box* stays 32×32 — so a
    // ResizeObserver on the diamond catches none of that. Observe the
    // header element instead: its height genuinely changes when the utility
    // bar collapses, which fires RO callbacks once per frame during the
    // 500ms transition. Without this, stopping scroll mid-transition leaves
    // the floating anchor frozen at the transient mid-transition value
    // because no further scroll events arrive to re-run update().
    //
    // transitionend backstops the RO: it fires exactly once per animated
    // property when the transition fully settles, guaranteeing one final
    // re-anchor after the layout has stabilised — covers any frame the RO
    // throttle might skip.
    const headerDiamondEl = document.getElementById("header-diamond");
    const headerEl = headerDiamondEl?.closest("header") ?? null;
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => handleScroll())
        : null;
    if (headerEl) ro?.observe(headerEl);
    if (headerDiamondEl) ro?.observe(headerDiamondEl);
    headerEl?.addEventListener("transitionend", handleScroll, true);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    window.visualViewport?.addEventListener("resize", handleScroll);
    window.visualViewport?.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      window.visualViewport?.removeEventListener("resize", handleScroll);
      window.visualViewport?.removeEventListener("scroll", handleScroll);
      headerEl?.removeEventListener("transitionend", handleScroll, true);
      ro?.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, isHomepage]);

  if (!isHomepage) return null;

  return (
    <div
      ref={elementRef}
      className="floating-diamond fixed z-50 pointer-events-none hidden xl:block"
      style={{
        opacity: mounted ? 0.7 : 0,
        transform: "scale(0.727)",
        transition: "opacity 1s var(--ease-luxury)",
        willChange: "transform, opacity",
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -m-2 rounded-full animate-diamond-glow bg-amethyst/20 blur-md" />
      <DiamondSvg className="relative block w-11 h-11" />
    </div>
  );
}
