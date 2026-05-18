"use client";

import { useTranslations } from "next-intl";
import { Button } from "@tge/ui";
import { Mail, Plus, UserCircle } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";

/**
 * Quick-action cluster rendered in the People Home header. Each button is
 * permission-gated independently so EDITORs etc. see a sensible subset.
 * Routes to the existing invite flows — no new dialogs introduced here.
 */
export function PeopleQuickActions() {
  const t = useTranslations("People.home.actions");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can action="users.manage">
        <Button asChild size="sm">
          <Link href="/people/team">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("inviteTeammate")}
          </Link>
        </Button>
      </Can>
      <Can action="agent.create">
        <Button asChild size="sm" variant="outline">
          <Link href="/people/agents/invite">
            <UserCircle className="mr-1.5 h-3.5 w-3.5" />
            {t("inviteAgent")}
          </Link>
        </Button>
      </Can>
      <Can action="academy.user.manage">
        <Button asChild size="sm" variant="outline">
          <Link href="/academy/students">
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            {t("inviteStudent")}
          </Link>
        </Button>
      </Can>
    </div>
  );
}
