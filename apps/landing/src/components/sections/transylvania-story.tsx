"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { ScrollReveal } from "@tge/ui";

interface StoryChapter {
  image: string;
  title: string;
  body: string;
}

interface TransylvaniaStoryProps {
  chapters: StoryChapter[];
}

function ParallaxPanel({
  chapter,
  index,
  total,
}: {
  chapter: StoryChapter;
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) {
          ticking = false;
          return;
        }
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const elementCenter = rect.top + rect.height / 2;
        const viewportCenter = windowHeight / 2;
        setOffset((elementCenter - viewportCenter) * 0.15);
        ticking = false;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const chapterNum = String(index + 1).padStart(2, "0");
  const totalStr = String(total).padStart(2, "0");

  return (
    <div ref={ref} className="relative h-screen overflow-hidden">
      {/* Parallax background image */}
      <div
        className="absolute inset-0 scale-[1.2]"
        style={{ transform: `translateY(${offset}px) scale(1.2)` }}
      >
        <Image
          src={chapter.image}
          alt={chapter.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority={index === 0}
        />
      </div>

      {/* Dark overlays */}
      <div className="absolute inset-0 bg-black/60 z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 z-[1]" />

      {/* Chapter indicator */}
      <div className="absolute top-8 right-8 md:top-12 md:right-12 z-10">
        <span className="text-copper/50 text-sm tracking-[0.3em] font-light">
          {chapterNum} / {totalStr}
        </span>
      </div>

      {/* Content positioned bottom-left */}
      <div className="absolute bottom-0 inset-x-0 z-10 p-8 md:p-16 lg:p-24">
        <div className="max-w-xl">
          <ScrollReveal direction="up">
            <h3 className="font-serif text-3xl md:text-4xl lg:text-5xl text-cream leading-tight mb-4 md:mb-6">
              {chapter.title}
            </h3>
            <div className="h-px w-12 bg-copper mb-4 md:mb-6" />
            <p className="text-cream/70 text-lg md:text-xl leading-relaxed">
              {chapter.body}
            </p>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}

export function TransylvaniaStory({ chapters }: TransylvaniaStoryProps) {
  return (
    <section>
      {chapters.map((chapter, index) => (
        <ParallaxPanel
          key={index}
          chapter={chapter}
          index={index}
          total={chapters.length}
        />
      ))}
    </section>
  );
}
