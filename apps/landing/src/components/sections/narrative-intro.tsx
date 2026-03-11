"use client";

import { ScrollReveal } from "@tge/ui";

interface NarrativeIntroProps {
  label: string;
  manifesto: string;
  teaser: string;
}

export function NarrativeIntro({ label, manifesto, teaser }: NarrativeIntroProps) {
  return (
    <section className="min-h-[60vh] flex items-center justify-center bg-background px-4">
      <div className="max-w-2xl mx-auto text-center py-24 md:py-32">
        <ScrollReveal>
          <p className="text-copper uppercase tracking-[0.25em] text-sm font-medium mb-8">
            {label}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <p className="font-serif text-2xl md:text-3xl text-cream leading-relaxed">
            {manifesto}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={400}>
          <div className="divider-fade my-10" />
        </ScrollReveal>

        <ScrollReveal delay={500}>
          <p className="text-cream-muted text-lg italic">
            {teaser}
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
