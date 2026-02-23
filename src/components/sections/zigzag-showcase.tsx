"use client";

import Image from "next/image";
import { SectionHeading } from "@/components/shared/section-heading";
import { Container } from "@/components/layout/container";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { cn } from "@/lib/utils";

interface ZigZagItem {
  image: string;
  title: string;
  description: string;
}

interface ZigZagShowcaseProps {
  title: string;
  subtitle: string;
  items: ZigZagItem[];
}

export function ZigZagShowcase({ title, subtitle, items }: ZigZagShowcaseProps) {
  return (
    <section className="section-padding bg-[#101014]">
      <Container>
        <SectionHeading title={title} subtitle={subtitle} />
        <div className="flex flex-col gap-16 lg:gap-24">
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                "grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center",
                index % 2 === 1 && "lg:direction-rtl"
              )}
            >
              <ScrollReveal
                direction={index % 2 === 0 ? "left" : "right"}
                className={cn(index % 2 === 1 && "lg:order-2")}
              >
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
                </div>
              </ScrollReveal>
              <ScrollReveal
                direction={index % 2 === 0 ? "right" : "left"}
                delay={200}
                className={cn(index % 2 === 1 && "lg:order-1")}
              >
                <div className="lg:px-4">
                  <h3 className="font-serif text-2xl md:text-3xl text-cream mb-4">
                    {item.title}
                  </h3>
                  <div className="h-px w-12 bg-copper mb-6" />
                  <p className="text-cream-muted leading-relaxed text-lg">
                    {item.description}
                  </p>
                </div>
              </ScrollReveal>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
