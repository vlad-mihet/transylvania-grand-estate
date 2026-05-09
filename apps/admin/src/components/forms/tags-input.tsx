"use client";

import { useState, type KeyboardEvent } from "react";
import { Input } from "@tge/ui";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

interface TagsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxLength?: number;
  id?: string;
}

/**
 * Chip input — type and press Enter or comma to add, backspace on an empty
 * field removes the last chip. Mono-styled to match the workbench's other
 * tag-like surfaces. Trims whitespace and silently dedupes.
 */
export function TagsInput({
  value,
  onChange,
  placeholder,
  maxLength = 80,
  id,
}: TagsInputProps) {
  const t = useTranslations("Common.tagsInput");
  const [draft, setDraft] = useState("");

  const commit = () => {
    const next = draft.trim();
    if (!next) return;
    if (value.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...value, next.slice(0, maxLength)]);
    setDraft("");
  };

  const remove = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 focus-within:border-copper/60 focus-within:ring-2 focus-within:ring-copper/15">
        {value.map((tag) => (
          <span
            key={tag}
            className="mono inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground"
          >
            {tag}
            <button
              type="button"
              aria-label={t("remove", { tag })}
              onClick={() => remove(tag)}
              className="text-muted-foreground/70 hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={value.length === 0 ? (placeholder ?? t("placeholder")) : ""}
          className="h-6 min-w-[120px] flex-1 border-0 bg-transparent px-1 py-0 text-sm shadow-none focus-visible:ring-0"
          maxLength={maxLength}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{t("helper")}</p>
    </div>
  );
}
