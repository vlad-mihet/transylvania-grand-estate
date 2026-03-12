import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Locale } from "@tge/types";
import { localize } from "@tge/utils";
import { fetchApi } from "@/lib/api";
import { mapApiDeveloper, mapApiProperties } from "@/lib/mappers";
import { developerTemplateMap, DEFAULT_TEMPLATE } from "./template-map";
import { PrestigeTemplate } from "@/components/developer/templates/prestige";
import { AtelierTemplate } from "@/components/developer/templates/atelier";
import { SovereignTemplate } from "@/components/developer/templates/sovereign";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  try {
    const developer = await fetchApi<any>(`/developers/${slug}`);
    return {
      title: developer.name,
      description: developer.shortDescription ? localize(developer.shortDescription, locale) : "",
    };
  } catch {
    return {};
  }
}

const templateComponents = {
  prestige: PrestigeTemplate,
  atelier: AtelierTemplate,
  sovereign: SovereignTemplate,
} as const;

export default async function DeveloperDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let raw;
  try {
    raw = await fetchApi<any>(`/developers/${slug}`);
  } catch {
    notFound();
  }

  const locale = (await getLocale()) as Locale;
  const developer = mapApiDeveloper(raw);
  const properties = mapApiProperties(raw.properties ?? []);

  const templateName = developerTemplateMap[slug] ?? DEFAULT_TEMPLATE;
  const Template = templateComponents[templateName];

  return <Template developer={developer} properties={properties} locale={locale} />;
}
