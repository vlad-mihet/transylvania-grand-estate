import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Academy.acceptInvite" });
  return { title: t("title") };
}

export default function AcceptInviteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
