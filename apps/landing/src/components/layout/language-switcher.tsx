"use client";

import { Fragment } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@tge/i18n/navigation";
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
  { code: "en", label: "EN" },
  { code: "ro", label: "RO" },
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

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-1 text-[11px] tracking-[0.1em] uppercase">
        {locales.map((l, i) => (
          <Fragment key={l.code}>
            {i > 0 && <span className="text-copper/25 mx-0.5">|</span>}
            <button
              onClick={() => handleLocaleChange(l.code)}
              className={cn(
                "px-1 py-0.5 transition-colors duration-300 cursor-pointer",
                locale === l.code
                  ? "text-copper font-medium"
                  : "text-cream-muted/50 hover:text-cream"
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
          className="text-cream/80 hover:text-copper hover:bg-transparent gap-1.5"
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm font-medium uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-popover border-copper/10 min-w-[80px]"
      >
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleLocaleChange(l.code)}
            className={locale === l.code ? "text-copper" : "text-cream/80"}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
