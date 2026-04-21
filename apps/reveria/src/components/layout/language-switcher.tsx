"use client";

import { Fragment } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@tge/ui";
import { Button } from "@tge/ui";
import { Globe } from "lucide-react";
import { cn } from "@tge/utils";

const locales = [
  { code: "ro", label: "RO" },
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "de", label: "DE" },
] as const;

interface LanguageSwitcherProps {
  variant?: "dropdown" | "inline";
}

export function LanguageSwitcher({ variant = "dropdown" }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const handleLocaleChange = (newLocale: string) => {
    // usePathname returns the pathname template (e.g. "/properties/[slug]" on
    // a dynamic route). Passing the current route params alongside lets
    // next-intl resolve the template into the correct localized URL for the
    // target locale — otherwise the router would navigate to the literal
    // "[slug]" path and 404.
    router.replace(
      // @ts-expect-error — next-intl's strict pathnames typing doesn't allow
      // a dynamically-typed pathname + params pair; at runtime it correctly
      // re-resolves whichever template the current page matches.
      { pathname, params },
      { locale: newLocale },
    );
  };

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-1 text-[11px] tracking-[0.1em] uppercase">
        {locales.map((l, i) => (
          <Fragment key={l.code}>
            {i > 0 && <span className="text-primary/25 mx-0.5">|</span>}
            <button
              type="button"
              onClick={() => handleLocaleChange(l.code)}
              aria-current={locale === l.code ? "true" : undefined}
              className={cn(
                "px-1 py-0.5 transition-colors duration-300 cursor-pointer",
                locale === l.code
                  ? "text-primary font-medium"
                  : "text-muted-foreground/50 hover:text-foreground"
              )}
            >
              {l.label}
            </button>
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-foreground/80 hover:text-primary hover:bg-transparent gap-1.5"
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm font-medium uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-popover border-primary/10 min-w-[80px]"
      >
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleLocaleChange(l.code)}
            aria-current={locale === l.code ? "true" : undefined}
            className={locale === l.code ? "text-primary" : "text-foreground/80"}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
