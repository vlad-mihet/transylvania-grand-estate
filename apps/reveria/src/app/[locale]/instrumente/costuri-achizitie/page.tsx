import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@tge/types";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PurchaseCostCalculator } from "@/components/calculators/purchase-cost-calculator";
import { Calculator, TrendingUp, Wallet, ChevronRight } from "lucide-react";
import { fetchCalculatorConfig } from "@/lib/financial-data";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ToolsPage.purchaseCost" });
  return createMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/instrumente/costuri-achizitie",
    locale,
  });
}

const otherTools = [
  {
    key: "mortgage" as const,
    href: "/instrumente/calculator-ipotecar" as const,
    icon: Calculator,
    color: "bg-primary/10 text-primary",
  },
  {
    key: "rentalYield" as const,
    href: "/instrumente/randament-inchiriere" as const,
    icon: TrendingUp,
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    key: "borrowingCapacity" as const,
    href: "/instrumente/capacitate-imprumut" as const,
    icon: Wallet,
    color: "bg-blue-500/10 text-blue-600",
  },
];

export default async function PurchaseCostPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const [t, tTools, tBreadcrumb, config] = await Promise.all([
    getTranslations("ToolsPage.purchaseCost"),
    getTranslations("ToolsPage"),
    getTranslations("Breadcrumb"),
    fetchCalculatorConfig(),
  ]);

  return (
    <>
      <section className="pt-10 md:pt-14 pb-8 bg-background">
        <Container>
          <Breadcrumb
            items={[
              { label: tBreadcrumb("home"), href: "/" },
              { label: tBreadcrumb("tools"), href: "/instrumente" },
              { label: tBreadcrumb("purchaseCosts") },
            ]}
            locale={locale}
          />
          <div className="mt-6 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              {t("title")}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-16 md:pb-20 bg-background">
        <Container>
          <PurchaseCostCalculator eurToRon={config.eurToRon} />
        </Container>
      </section>

      <section className="pb-16 md:pb-24 bg-background border-t border-border pt-12">
        <Container>
          <h2 className="text-xl font-semibold text-foreground mb-6">
            {tTools("otherTools")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {otherTools.map((tool) => (
              <Link key={tool.key} href={tool.href} className="group block">
                <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tool.color}`}
                    >
                      <tool.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">
                        {tTools(`tools.${tool.key}.title`)}
                      </h3>
                      <span className="text-primary text-xs font-medium flex items-center gap-0.5 mt-0.5 group-hover:underline">
                        {tTools(`tools.${tool.key}.cta`)}
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
