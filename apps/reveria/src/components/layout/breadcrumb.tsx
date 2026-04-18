import { Link } from "@tge/i18n/navigation";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  variant?: "default" | "footer";
}

export function Breadcrumb({ items, variant = "default" }: BreadcrumbProps) {
  const isFooter = variant === "footer";
  return (
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
  );
}
