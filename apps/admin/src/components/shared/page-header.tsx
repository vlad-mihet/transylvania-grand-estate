"use client";

import { Button } from "@tge/ui";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface PageHeaderProps {
  title: string;
  description?: string;
  createHref?: string;
  createLabel?: string;
}

export function PageHeader({
  title,
  description,
  createHref,
  createLabel,
}: PageHeaderProps) {
  const t = useTranslations("Common");

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[0.01em]">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {createHref && (
        <Button asChild>
          <Link href={createHref}>
            <Plus className="mr-2 h-4 w-4" />
            {createLabel ?? t("createNew")}
          </Link>
        </Button>
      )}
    </div>
  );
}
