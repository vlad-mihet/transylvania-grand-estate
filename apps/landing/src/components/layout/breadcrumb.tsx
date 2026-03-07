import { Link } from "@tge/i18n/navigation";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-cream-muted/30 flex-shrink-0" />
            )}
            {isLast || !item.href ? (
              <span className="text-copper truncate">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-cream-muted/60 hover:text-copper transition-colors duration-300 truncate"
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
