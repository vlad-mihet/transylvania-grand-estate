import { Button } from "@tge/ui";
import { ShieldOff } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function ForbiddenPage() {
  const t = await getTranslations("Forbidden");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-card">
          <ShieldOff className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <p className="mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            403 · {t("forbidden")}
          </p>
          <h1 className="text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/">{t("backToDashboard")}</Link>
        </Button>
      </div>
    </div>
  );
}
