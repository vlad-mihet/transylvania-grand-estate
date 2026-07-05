import { notFound } from "next/navigation";
import type { Locale } from "@tge/types";
import type { ApiProperty } from "@tge/types";
import { fetchApi } from "@tge/api-client";
import { redirect } from "@/i18n/navigation";
import { REVERY_TIER } from "@/lib/properties";

// CRM deep-link required by the REBS integration docs ("Link din CRM către
// site"): the CRM links to `/id/<crm-id>/` and we forward to the imported
// listing's canonical page. The unprefixed `/id/1234/` form is locale-routed
// by the proxy before it lands here.
export default async function CrmIdRedirectPage({
  params,
}: {
  params: Promise<{ externalId: string; locale: Locale }>;
}) {
  const { externalId, locale } = await params;

  let property: ApiProperty;
  try {
    property = await fetchApi<ApiProperty>(
      `/properties/external/rebs/${encodeURIComponent(externalId)}?locale=${locale}`,
    );
  } catch {
    notFound();
  }

  // Same guard as the detail page: never leak a non-Revery tier via direct URL.
  if (property.tier && property.tier !== REVERY_TIER) notFound();

  redirect({ href: `/properties/${property.slug}`, locale });
}
