"use client";

import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { Container } from "@/components/layout/container";
import {
  Calculator,
  Receipt,
  TrendingUp,
  Wallet,
  ChevronRight,
} from "lucide-react";

const tools = [
  {
    key: "mortgage" as const,
    href: "/instrumente/calculator-ipotecar",
    icon: Calculator,
    color: "bg-primary/10 text-primary",
  },
  {
    key: "purchaseCost" as const,
    href: "/instrumente/costuri-achizitie",
    icon: Receipt,
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    key: "rentalYield" as const,
    href: "/instrumente/randament-inchiriere",
    icon: TrendingUp,
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    key: "borrowingCapacity" as const,
    href: "/instrumente/capacitate-imprumut",
    icon: Wallet,
    color: "bg-blue-500/10 text-blue-600",
  },
];

export function UsefulTools() {
  const t = useTranslations("HomePage.usefulTools");

  return (
    <section className="py-12 sm:py-14 md:py-20">
      <Container>
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            {t("title")}
          </h2>
          <Link
            href="/instrumente"
            className="hidden sm:flex text-primary text-sm font-medium items-center gap-1 hover:underline"
          >
            {t("viewAll")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.key}
              href={tool.href}
              className="group block"
            >
              <div className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/20 transition-all h-full">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tool.color}`}
                  >
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground mb-1">
                      {t(`tools.${tool.key}.title`)}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      {t(`tools.${tool.key}.description`)}
                    </p>
                    <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:underline">
                      {t(`tools.${tool.key}.cta`)}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/instrumente"
            className="text-primary text-sm font-medium inline-flex items-center gap-1 hover:underline"
          >
            {t("viewAll")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
