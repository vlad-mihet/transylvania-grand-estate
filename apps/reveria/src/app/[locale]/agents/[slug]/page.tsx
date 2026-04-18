import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { fetchApi } from "@tge/api-client";
import { mapApiProperties } from "@tge/api-client";
import { fetchPropertiesByAgent } from "@/lib/properties";
import type { Agent, Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { Button } from "@tge/ui";
import { Container } from "@/components/layout/container";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PropertyGrid } from "@/components/property/property-grid";
import { CTABanner } from "@/components/sections/cta-banner";
import { Phone, Mail } from "lucide-react";

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  try {
    const agent = await fetchApi<Agent>(`/agents/${slug}`);
    const name = `${agent.firstName} ${agent.lastName}`;
    return { title: name, description: localize(agent.bio, "en") };
  } catch {
    return {};
  }
}

export default async function AgentDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const t = await getTranslations("AgentDetailPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");
  const locale = await getLocale() as Locale;

  let agent;
  try {
    agent = await fetchApi<Agent>(`/agents/${slug}`);
  } catch {
    notFound();
  }
  const name = `${agent.firstName} ${agent.lastName}`;

  const propertiesRaw = await fetchPropertiesByAgent(agent.id, 24);
  const properties = mapApiProperties(propertiesRaw);

  return (
    <>
      <section className="pt-10 md:pt-14 pb-10 md:pb-14 bg-background">
        <Container>
          <Breadcrumb
            items={[
              { label: tBreadcrumb("home"), href: "/" },
              { label: tBreadcrumb("agents"), href: "/agents" },
              { label: name },
            ]}
          />
          <div className="mt-6 flex flex-col md:flex-row md:items-start gap-8">
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden bg-muted shrink-0">
              {agent.photo ? (
                <Image
                  src={agent.photo}
                  alt={name}
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-muted-foreground/30">
                  {agent.firstName[0]}{agent.lastName[0]}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                {name}
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mb-4">
                {localize(agent.bio, locale)}
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={`tel:${agent.phone}`}>
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-1.5" />
                    {t("callAgent")}
                  </Button>
                </a>
                <a href={`mailto:${agent.email}`}>
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-1.5" />
                    {t("emailAgent")}
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {properties.length > 0 && (
        <section className="pb-16 md:pb-24 bg-background">
          <Container>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {t("properties", { name })}
            </h2>
            <PropertyGrid properties={properties} />
          </Container>
        </section>
      )}

      <CTABanner
        title={t("cta.title", { name })}
        subtitle={t("cta.subtitle")}
        buttonText={t("cta.button")}
        buttonHref="/contact"
      />
    </>
  );
}
