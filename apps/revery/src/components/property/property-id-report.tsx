import { getTranslations } from "next-intl/server";
import { Flag } from "lucide-react";
import { Button } from "@tge/ui";
import { InquiryTrigger } from "@tge/ui";

interface PropertyIdReportProps {
  id: string;
  title: string;
  slug: string;
}

export async function PropertyIdReport({
  id,
  title,
  slug,
}: PropertyIdReportProps) {
  const t = await getTranslations("PropertyDetail");
  const shortId = id.slice(0, 8).toUpperCase();

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3 text-sm">
      <span className="text-muted-foreground">
        {t("id")}:{" "}
        <span className="font-mono text-foreground">{shortId}</span>
      </span>
      <InquiryTrigger
        context={{
          type: "general",
          entityName: title,
          entitySlug: slug,
        }}
      >
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Flag className="h-4 w-4 mr-1.5" />
          {t("reportListing")}
        </Button>
      </InquiryTrigger>
    </div>
  );
}
