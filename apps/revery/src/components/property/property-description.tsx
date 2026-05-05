"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PropertyDescriptionProps {
  description: string;
}

const COLLAPSED_PARAGRAPHS = 3;

export function PropertyDescription({ description }: PropertyDescriptionProps) {
  const t = useTranslations("PropertyDetail");
  const [expanded, setExpanded] = useState(false);

  const paragraphs = useMemo(
    () => description.split("\n\n").filter(Boolean),
    [description],
  );

  const canCollapse = paragraphs.length > COLLAPSED_PARAGRAPHS;
  const visible =
    expanded || !canCollapse
      ? paragraphs
      : paragraphs.slice(0, COLLAPSED_PARAGRAPHS);

  return (
    <section>
      <h2 className="text-2xl font-bold text-foreground mb-3">
        {t("description")}
      </h2>
      <div className="text-foreground/80 leading-relaxed space-y-4">
        {visible.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {canCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline cursor-pointer"
        >
          {expanded ? t("readLess") : t("readMore")}
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      )}
    </section>
  );
}
