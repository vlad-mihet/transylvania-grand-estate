"use client";

import {
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@tge/ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "next-intl";

interface BilingualMarkdownEditorProps {
  label: string;
  valueEn: string;
  valueRo: string;
  onChangeEn: (value: string) => void;
  onChangeRo: (value: string) => void;
  valueFr?: string;
  valueDe?: string;
  onChangeFr?: (value: string) => void;
  onChangeDe?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

type Locale = "ro" | "en" | "fr" | "de";

/**
 * Markdown-aware sibling of `BilingualTextarea`. Outer tabs switch the
 * locale; inside each locale a secondary Write/Preview pair lets editors
 * sanity-check the rendering before save. Same render pipeline the
 * academy reader uses (`react-markdown` + `remark-gfm`) so WYSIWYG is
 * faithful.
 *
 * Kept separate from `BilingualTextarea` so non-markdown fields (title,
 * excerpt) don't pay the preview-tab tax or pull markdown libs.
 */
export function BilingualMarkdownEditor({
  label,
  valueEn,
  valueRo,
  onChangeEn,
  onChangeRo,
  valueFr,
  valueDe,
  onChangeFr,
  onChangeDe,
  placeholder,
  required,
  rows = 14,
}: BilingualMarkdownEditorProps) {
  const t = useTranslations("Common");

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Tabs defaultValue="ro" className="w-full">
        <TabsList className="h-8 bg-copper/[0.06]">
          <TabsTrigger
            value="ro"
            className="text-xs px-3 tracking-[0.1em] font-semibold data-[state=active]:text-copper"
          >
            RO
          </TabsTrigger>
          <TabsTrigger
            value="en"
            className="text-xs px-3 tracking-[0.1em] font-semibold data-[state=active]:text-copper"
          >
            EN
          </TabsTrigger>
          {onChangeFr && (
            <TabsTrigger
              value="fr"
              className="text-xs px-3 tracking-[0.1em] font-semibold data-[state=active]:text-copper"
            >
              FR
            </TabsTrigger>
          )}
          {onChangeDe && (
            <TabsTrigger
              value="de"
              className="text-xs px-3 tracking-[0.1em] font-semibold data-[state=active]:text-copper"
            >
              DE
            </TabsTrigger>
          )}
        </TabsList>

        <LocalePanel
          locale="ro"
          value={valueRo}
          onChange={onChangeRo}
          placeholder={placeholder ? `${placeholder} (${t("romanian")})` : t("romanian")}
          rows={rows}
        />
        <LocalePanel
          locale="en"
          value={valueEn}
          onChange={onChangeEn}
          placeholder={placeholder ? `${placeholder} (${t("english")})` : t("english")}
          rows={rows}
        />
        {onChangeFr && (
          <LocalePanel
            locale="fr"
            value={valueFr ?? ""}
            onChange={onChangeFr}
            placeholder={placeholder ? `${placeholder} (${t("french")})` : t("french")}
            rows={rows}
          />
        )}
        {onChangeDe && (
          <LocalePanel
            locale="de"
            value={valueDe ?? ""}
            onChange={onChangeDe}
            placeholder={placeholder ? `${placeholder} (${t("german")})` : t("german")}
            rows={rows}
          />
        )}
      </Tabs>
    </div>
  );
}

function LocalePanel({
  locale,
  value,
  onChange,
  placeholder,
  rows,
}: {
  locale: Locale;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  rows: number;
}) {
  return (
    <TabsContent value={locale} className="mt-2">
      <Tabs defaultValue="write" className="w-full">
        <TabsList className="h-7 bg-muted/50">
          <TabsTrigger
            value="write"
            className="px-3 text-[11px] tracking-wider font-medium data-[state=active]:bg-background"
          >
            Write
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="px-3 text-[11px] tracking-wider font-medium data-[state=active]:bg-background"
          >
            Preview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="write" className="mt-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="font-mono text-[13px]"
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-2">
          {/* Preview sits inside a bordered panel so it visually reads as
              a rendered surface, not another editable field. Tailwind's
              `prose` gives editorial typography without wiring a plugin. */}
          <div
            className="min-h-[120px] rounded-md border border-border bg-card p-4 text-sm"
            style={{ minHeight: `${Math.max(rows * 20, 160)}px` }}
          >
            {value.trim() ? (
              <article className="prose prose-sm max-w-none prose-neutral">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
              </article>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nothing to preview yet — write some markdown in the Write tab.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </TabsContent>
  );
}
