"use client";

import { useTranslations } from "next-intl";
import { Button } from "@tge/ui";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/shared/states";

export default function StudentNotFound() {
  const t = useTranslations("Academy.students");
  const tc = useTranslations("Common");

  return (
    <div className="flex flex-1 items-center justify-center py-14">
      <EmptyState
        title={tc("notFoundTitle")}
        description={tc("notFoundDescription")}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/academy/students">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t("detailBackToList")}
            </Link>
          </Button>
        }
      />
    </div>
  );
}
