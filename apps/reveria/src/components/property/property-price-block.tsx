import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { Locale } from "@tge/types";
import { Link } from "@tge/i18n/navigation";
import { Card, CardContent, Separator } from "@tge/ui";

interface PropertyPriceBlockProps {
  title: string;
  price: number;
  pricePerSqm?: number;
  locale: Locale;
  city: string;
  citySlug: string;
  neighborhood: string;
}

const intlLocaleMap: Record<Locale, string> = {
  en: "en-US",
  ro: "ro-RO",
  fr: "fr-FR",
  de: "de-DE",
};

function formatEurAmount(value: number, locale: Locale): string {
  const localeStr = intlLocaleMap[locale] ?? "en-US";
  const formatted = new Intl.NumberFormat(localeStr, {
    maximumFractionDigits: 0,
  }).format(value);
  return `${formatted} €`;
}

export function PropertyPriceBlock({
  title,
  price,
  pricePerSqm,
  locale,
  city,
  citySlug,
  neighborhood,
}: PropertyPriceBlockProps) {
  const t = useTranslations("PropertyDetail");

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-5 md:p-6">
        <p className="text-sm md:text-base text-foreground leading-snug mb-3">
          {title}
        </p>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-3xl md:text-[2.25rem] font-bold text-foreground leading-none tracking-tight">
            {formatEurAmount(price, locale)}
          </p>
          {pricePerSqm && (
            <span className="text-base text-muted-foreground">
              {t("pricePerSqm", {
                value: new Intl.NumberFormat(
                  intlLocaleMap[locale] ?? "en-US",
                ).format(pricePerSqm),
              })}
            </span>
          )}
        </div>

        <Separator className="my-4 bg-border" />

        <div className="flex items-center gap-2 text-sm text-foreground">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span>
            {neighborhood},{" "}
            <Link
              href={`/cities/${citySlug}`}
              className="text-primary hover:underline underline-offset-2"
            >
              {city}
            </Link>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
