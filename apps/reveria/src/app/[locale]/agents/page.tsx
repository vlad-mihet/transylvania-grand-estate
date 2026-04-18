import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchApi } from "@tge/api-client";
import type { Agent, Locale } from "@tge/types";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { ChevronRight, Phone, Mail } from "lucide-react";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AgentsPage" });
  return createMetadata({
    title: t("hero.title"),
    description: t("hero.subtitle"),
    path: "/agents",
    locale,
  });
}

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("AgentsPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");
  const agents = await fetchApi<Agent[]>("/agents?active=true");

  return (
    <>
      <PageHeader
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        breadcrumbItems={[
          { label: tBreadcrumb("home"), href: "/" },
          { label: tBreadcrumb("agents") },
        ]}
        locale={locale}
      />

      <section className="pb-16 md:pb-24 bg-background">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link
                key={agent.slug}
                href={{ pathname: "/agents/[slug]", params: { slug: agent.slug } }}
                className="group"
              >
                <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {agent.photo ? (
                      <Image
                        src={agent.photo}
                        alt={`${agent.firstName} ${agent.lastName}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-muted-foreground/30">
                        {agent.firstName[0]}{agent.lastName[0]}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg font-semibold text-foreground mb-1">
                      {agent.firstName} {agent.lastName}
                    </h2>
                    <div className="flex flex-col gap-1.5 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {agent.phone}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {agent.email}
                      </span>
                    </div>
                    <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:underline">
                      {t("viewProfile")}
                      <ChevronRight className="h-4 w-4" />
                    </span>
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
