"use client";

import { Label, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from "@tge/ui";
import { useTranslations } from "next-intl";

interface BilingualTextareaProps {
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

export function BilingualTextarea({
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
  rows = 4,
}: BilingualTextareaProps) {
  const t = useTranslations("Common");

  return (
    <div className="space-y-2">
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Tabs defaultValue="ro" className="w-full">
        <TabsList className="h-8 bg-copper/[0.06]">
          <TabsTrigger value="ro" className="text-xs px-3 tracking-[0.1em] font-semibold data-[state=active]:text-copper">RO</TabsTrigger>
          <TabsTrigger value="en" className="text-xs px-3 tracking-[0.1em] font-semibold data-[state=active]:text-copper">EN</TabsTrigger>
          {onChangeFr && <TabsTrigger value="fr" className="text-xs px-3 tracking-[0.1em] font-semibold data-[state=active]:text-copper">FR</TabsTrigger>}
          {onChangeDe && <TabsTrigger value="de" className="text-xs px-3 tracking-[0.1em] font-semibold data-[state=active]:text-copper">DE</TabsTrigger>}
        </TabsList>
        <TabsContent value="ro" className="mt-2">
          <Textarea
            value={valueRo}
            onChange={(e) => onChangeRo(e.target.value)}
            placeholder={placeholder ? `${placeholder} (${t("romanian")})` : t("romanian")}
            rows={rows}
          />
        </TabsContent>
        <TabsContent value="en" className="mt-2">
          <Textarea
            value={valueEn}
            onChange={(e) => onChangeEn(e.target.value)}
            placeholder={placeholder ? `${placeholder} (${t("english")})` : t("english")}
            rows={rows}
          />
        </TabsContent>
        {onChangeFr && (
          <TabsContent value="fr" className="mt-2">
            <Textarea
              value={valueFr ?? ""}
              onChange={(e) => onChangeFr(e.target.value)}
              placeholder={placeholder ? `${placeholder} (${t("french")})` : t("french")}
              rows={rows}
            />
          </TabsContent>
        )}
        {onChangeDe && (
          <TabsContent value="de" className="mt-2">
            <Textarea
              value={valueDe ?? ""}
              onChange={(e) => onChangeDe(e.target.value)}
              placeholder={placeholder ? `${placeholder} (${t("german")})` : t("german")}
              rows={rows}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
