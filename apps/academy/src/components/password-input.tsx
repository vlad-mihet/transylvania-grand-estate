"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@tge/utils";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...rest }, ref) {
    const t = useTranslations("Academy.passwordToggle");
    const [revealed, setRevealed] = useState(false);

    return (
      <div className="relative">
        <input
          {...rest}
          ref={ref}
          type={revealed ? "text" : "password"}
          className={cn(
            "w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]",
            className,
          )}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-pressed={revealed}
          aria-label={revealed ? t("hide") : t("show")}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[color:var(--color-muted-foreground)] transition-colors hover:text-[color:var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)]"
        >
          {revealed ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
