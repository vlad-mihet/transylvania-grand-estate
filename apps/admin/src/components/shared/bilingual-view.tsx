"use client";

import { Label, Tabs, TabsContent, TabsList, TabsTrigger } from "@tge/ui";
import { cn } from "@tge/utils";

interface BilingualViewProps {
  label: string;
  valueEn?: string | null;
  valueRo?: string | null;
  valueFr?: string | null;
  valueDe?: string | null;
  /** Use when the value can span multiple paragraphs. */
  multiline?: boolean;
}

/**
 * Read-only counterpart to `BilingualInput` / `BilingualTextarea`. Renders
 * EN/RO/FR/DE tabs that swap between the available translations. Languages
 * with empty values still show the tab but render a muted em-dash.
 */
export function BilingualView({
  label,
  valueEn,
  valueRo,
  valueFr,
  valueDe,
  multiline = false,
}: BilingualViewProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
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
          <TabsTrigger
            value="fr"
            className="text-xs px-3 tracking-[0.1em] font-semibold data-[state=active]:text-copper"
          >
            FR
          </TabsTrigger>
          <TabsTrigger
            value="de"
            className="text-xs px-3 tracking-[0.1em] font-semibold data-[state=active]:text-copper"
          >
            DE
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ro" className="mt-2">
          <LocalizedValue value={valueRo} multiline={multiline} />
        </TabsContent>
        <TabsContent value="en" className="mt-2">
          <LocalizedValue value={valueEn} multiline={multiline} />
        </TabsContent>
        <TabsContent value="fr" className="mt-2">
          <LocalizedValue value={valueFr} multiline={multiline} />
        </TabsContent>
        <TabsContent value="de" className="mt-2">
          <LocalizedValue value={valueDe} multiline={multiline} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LocalizedValue({
  value,
  multiline,
}: {
  value: string | null | undefined;
  multiline: boolean;
}) {
  if (!value) {
    return <span className="text-sm text-muted-foreground/60">—</span>;
  }
  return (
    <p
      className={cn(
        "text-sm text-foreground",
        multiline && "whitespace-pre-wrap leading-relaxed",
      )}
    >
      {value}
    </p>
  );
}
