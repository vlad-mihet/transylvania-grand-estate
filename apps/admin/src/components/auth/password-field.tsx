"use client";

import { forwardRef, useRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input, Label } from "@tge/ui";
import { cn } from "@tge/utils";
import { useCapsLock } from "@/hooks/use-caps-lock";

interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  label: string;
  error?: string;
  /** Set false on confirm fields where the caps-lock warning would double up. */
  showCapsLock?: boolean;
}

/**
 * Input + eye-toggle + caps-lock indicator — the bit we were hand-rolling on
 * login, reset-password, and accept-invite. Forwards refs so RHF's
 * `register()` spread works unchanged; also supports controlled state.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(
    { id, label, error, showCapsLock = true, className, ...rest },
    ref,
  ) {
    const t = useTranslations("Auth");
    const [revealed, setRevealed] = useState(false);
    const innerRef = useRef<HTMLInputElement | null>(null);
    const capsLockOn = useCapsLock(innerRef);

    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs font-medium">
          {label}
        </Label>
        <div className="relative">
          <Input
            {...rest}
            id={id}
            type={revealed ? "text" : "password"}
            className={cn("h-9 pr-9", className)}
            ref={(node) => {
              innerRef.current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) ref.current = node;
            }}
          />
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
            aria-label={revealed ? t("hidePassword") : t("showPassword")}
            className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {revealed ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        {showCapsLock && capsLockOn && (
          <p
            aria-live="polite"
            className="mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-[var(--color-warning)]"
          >
            <Lock className="h-3 w-3" />
            {t("capsLockOn")}
          </p>
        )}
        {error && (
          <p className="text-[11px] text-[var(--color-danger)]">{error}</p>
        )}
      </div>
    );
  },
);
