"use client";

import { useTranslations } from "next-intl";

interface PasswordStrengthProps {
  password: string;
}

interface Rule {
  key: "length" | "lower" | "upper" | "digit";
  test: (value: string) => boolean;
}

const RULES: readonly Rule[] = [
  { key: "length", test: (v) => v.length >= 12 },
  { key: "lower", test: (v) => /[a-z]/.test(v) },
  { key: "upper", test: (v) => /[A-Z]/.test(v) },
  { key: "digit", test: (v) => /\d/.test(v) },
];

/**
 * 4-rule password policy visualiser. Matches the admin-side password rules
 * enforced by `passwordPolicy` in `@tge/types` — surfaces them to the user
 * instead of leaving a generic "min 12 characters" hint. Pass the raw
 * password; empty string renders all rules in the "unmet" state.
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  const t = useTranslations("Academy.passwordStrength");
  return (
    <ul
      aria-label={t("ariaLabel")}
      className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px]"
    >
      {RULES.map((rule) => {
        const met = password !== "" && rule.test(password);
        return (
          <li
            key={rule.key}
            className={
              met
                ? "text-[color:var(--color-success)]"
                : "text-[color:var(--color-muted-foreground)]"
            }
          >
            <span aria-hidden="true">{met ? "✓" : "○"}</span>{" "}
            {t(`rule_${rule.key}`)}
          </li>
        );
      })}
    </ul>
  );
}
