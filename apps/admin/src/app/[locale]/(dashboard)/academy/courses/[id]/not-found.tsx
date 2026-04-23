"use client";

import { useTranslations } from "next-intl";
import { Button } from "@tge/ui";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/shared/states";

export default function CourseNotFound() {
  const t = useTranslations("Academy.courses");

  return (
    <div className="flex flex-1 items-center justify-center py-14">
      <EmptyState
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/academy/courses">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t("detailBackToList")}
            </Link>
          </Button>
        }
      />
    </div>
  );
}
