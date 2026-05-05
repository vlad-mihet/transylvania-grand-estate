import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import type { Locale } from "@tge/types";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbListSchema } from "@/lib/jsonld";

type LinkHref = ComponentProps<typeof Link>["href"];

interface BreadcrumbItem {
  label: string;
  href?: LinkHref;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  variant?: "default" | "footer";
  locale?: Locale;
}

export function Breadcrumb({ items, variant = "default", locale }: BreadcrumbProps) {
  const isFooter = variant === "footer";
  return (
    <>
      {locale && items.length > 1 && (
        <JsonLd schema={breadcrumbListSchema(items, locale)} />
      )}
    <nav
      aria-label="Breadcrumb"
      className={
        isFooter
          ? "flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
          : "flex items-center gap-2 text-sm"
      }
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight
                className={
                  isFooter
                    ? "h-3 w-3 text-muted-foreground/60 flex-shrink-0"
                    : "h-3 w-3 text-muted-foreground flex-shrink-0"
                }
              />
            )}
            {isLast || !item.href ? (
              <span
                className={
                  isFooter
                    ? "text-muted-foreground truncate"
                    : "text-primary truncate"
                }
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className={
                  isFooter
                    ? "hover:text-primary transition-colors truncate"
                    : "text-muted-foreground hover:text-primary transition-colors duration-300 truncate"
                }
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
    </>
  );
}
