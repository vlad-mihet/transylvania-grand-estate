"use client";

import { Button } from "@tge/ui";
import { useTranslations } from "next-intl";
import { Can } from "@/components/shared/can";
import { TRANSYLVANIA_EXTENDED, TRANSYLVANIA_STRICT } from "./constants";

interface ScopePresetsProps {
  activeCount: number;
  onApply: (slugs: string[]) => void;
  isPending: boolean;
}

/**
 * Header action cluster for the Counties page — current-scope count +
 * Transylvania strict / extended preset buttons. Gated on
 * `site-config.update` so only SUPER_ADMIN / ADMIN see the preset swap.
 */
export function ScopePresets({
  activeCount,
  onApply,
  isPending,
}: ScopePresetsProps) {
  const t = useTranslations("Counties");
  return (
    <>
      <span className="mono text-[11px] text-muted-foreground">
        {t("tgeScopeCount", { count: activeCount })}
      </span>
      <Can action="site-config.update">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onApply(TRANSYLVANIA_STRICT)}
          disabled={isPending}
        >
          {t("presetStrict")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onApply(TRANSYLVANIA_EXTENDED)}
          disabled={isPending}
        >
          {t("presetExtended")}
        </Button>
      </Can>
    </>
  );
}
