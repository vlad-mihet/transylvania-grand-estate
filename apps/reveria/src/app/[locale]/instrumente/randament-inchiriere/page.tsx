import { getTranslations } from "next-intl/server";
import { Link } from "@tge/i18n/navigation";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RentalYieldCalculator } from "@/components/calculators/rental-yield-calculator";
import { Calculator, Receipt, Wallet, ChevronRight } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("ToolsPage.rentalYield");
  return { title: t("meta.title"), description: t("meta.description") };
}

const otherTools = [
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
    key: "borrowingCapacity" as const,
    href: "/instrumente/capacitate-imprumut",
    icon: Wallet,
    color: "bg-blue-500/10 text-blue-600",
  },
];

export default async function RentalYieldPage() {
  const t = await getTranslations("ToolsPage.rentalYield");
  const tTools = await getTranslations("ToolsPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");

  return (
    <>
      <section className="pt-10 md:pt-14 pb-8 bg-background">
        <Container>
          <Breadcrumb
            items={[
              { label: tBreadcrumb("home"), href: "/" },
              { label: tBreadcrumb("tools"), href: "/instrumente" },
              { label: tBreadcrumb("rentalYield") },
            ]}
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
          <RentalYieldCalculator />
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
