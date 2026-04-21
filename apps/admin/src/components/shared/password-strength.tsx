"use client";

import { Check, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";

/**
 * Live feedback for the 4-rule password policy. Rendered beneath the
 * password input on accept-invite + reset-password so users see their
 * progress instead of hitting submit-then-error cycles. Rules mirror the
 * server-side `passwordPolicy` in `@tge/types/schemas/auth`.
 */
interface PasswordStrengthProps {
  value: string;
  className?: string;
}

interface Rule {
  key: "len" | "lower" | "upper" | "digit";
  test: (v: string) => boolean;
}

const RULES: Rule[] = [
  { key: "len", test: (v) => v.length >= 12 },
  { key: "lower", test: (v) => /[a-z]/.test(v) },
  { key: "upper", test: (v) => /[A-Z]/.test(v) },
  { key: "digit", test: (v) => /\d/.test(v) },
];

export function PasswordStrength({ value, className }: PasswordStrengthProps) {
  const t = useTranslations("PasswordStrength");
  return (
    <ul
      aria-live="polite"
      className={cn(
        "mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]",
        className,
      )}
    >
      {RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.key}
            className={cn(
              "flex items-center gap-1.5",
              ok
                ? "text-[var(--color-success,#22a06b)]"
                : "text-muted-foreground",
            )}
          >
            {ok ? (
              <Check className="h-3 w-3" aria-hidden />
            ) : (
              <Minus className="h-3 w-3" aria-hidden />
            )}
            <span>{t(rule.key)}</span>
          </li>
        );
      })}
    </ul>
  );
}
