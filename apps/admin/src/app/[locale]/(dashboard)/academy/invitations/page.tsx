"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { usePermissions } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { AcademyInvitationsList } from "@/app/[locale]/(dashboard)/people/invitations/_components/academy-invitations-list";

/**
 * Academy-scoped invitations page. Thin wrapper around the academy half of
 * the combined invitations component at `/people/invitations`. The combined
 * page (with team + academy tabs) stays available — this surface gives the
 * Academy product its own canonical URL within the `/academy/**` tree.
 */
export default function AcademyInvitationsPage() {
  const t = useTranslations("People.invitations");
  const router = useRouter();
  const { can } = usePermissions();
  const canAcademy = can("academy.user.manage");

  useEffect(() => {
    if (!canAcademy) router.replace("/403");
  }, [canAcademy, router]);

  if (!canAcademy) return null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("pageTitle")} description={t("description")} />
      <AcademyInvitationsList />
    </div>
  );
}
