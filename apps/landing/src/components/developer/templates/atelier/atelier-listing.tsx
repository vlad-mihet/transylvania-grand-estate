"use client";

import { useMemo } from "react";
import type { Property, Locale } from "@tge/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@tge/ui";
import { Container } from "@/components/layout/container";
import { PropertyGrid } from "@/components/property/property-grid";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";

interface AtelierListingProps {
  properties: Property[];
  locale: Locale;
}

export function AtelierListing({ properties }: AtelierListingProps) {
  const t = useTranslations("DeveloperShowcase");
  const tTypes = useTranslations("Common.propertyTypes");

  const propertyTypes = useMemo(() => {
    const unique = Array.from(new Set(properties.map((p) => p.type)));
    return ["all", ...unique];
  }, [properties]);

  const filteredProperties = useMemo(() => {
    const map: Record<string, Property[]> = { all: properties };
    for (const type of propertyTypes) {
      if (type !== "all") {
        map[type] = properties.filter((p) => p.type === type);
      }
    }
    return map;
  }, [properties, propertyTypes]);

  if (properties.length === 0) return null;

  return (
    <section className="bg-background section-padding" id="projects">
      <Container>
        <h2 className="font-serif text-3xl md:text-4xl text-cream mb-8">
          {t("fullPortfolio")}
        </h2>

        <Tabs defaultValue="all">
          <TabsList className="bg-transparent border-b border-copper/[0.08] rounded-none p-0 h-auto w-full justify-start gap-0 mb-1">
            {propertyTypes.map((type) => (
              <TabsTrigger
                key={type}
                value={type}
                className={cn(
                  "relative rounded-none border-0 shadow-none bg-transparent cursor-pointer",
                  "px-6 py-4 text-[13px] tracking-[0.2em] uppercase font-medium",
                  "text-cream-muted/40 transition-all duration-500 ease-out",
                  "hover:text-cream-muted/70 hover:bg-white/[0.02]",
                  "data-[state=active]:text-copper data-[state=active]:bg-copper/[0.04]",
                  "data-[state=active]:shadow-none",
                  "after:absolute after:bottom-[-1px] after:inset-x-0 after:h-[2px]",
                  "after:bg-copper after:origin-center",
                  "after:scale-x-0 after:transition-transform after:duration-500 after:ease-out",
                  "data-[state=active]:after:scale-x-100",
                )}
              >
                {type === "all" ? t("all") : tTypes(type)}
              </TabsTrigger>
            ))}
          </TabsList>

          {propertyTypes.map((type) => (
            <TabsContent key={type} value={type} className="mt-8">
              <PropertyGrid properties={filteredProperties[type]} />
            </TabsContent>
          ))}
        </Tabs>
      </Container>
    </section>
  );
}
