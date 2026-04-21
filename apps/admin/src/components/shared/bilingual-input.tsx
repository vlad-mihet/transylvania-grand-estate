"use client";

import { Input, Label, Tabs, TabsContent, TabsList, TabsTrigger } from "@tge/ui";
import { useTranslations } from "next-intl";

interface BilingualInputProps {
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
}

export function BilingualInput({
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
}: BilingualInputProps) {
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
          <Input
            value={valueRo}
            onChange={(e) => onChangeRo(e.target.value)}
            placeholder={placeholder ? `${placeholder} (${t("romanian")})` : t("romanian")}
          />
        </TabsContent>
        <TabsContent value="en" className="mt-2">
          <Input
            value={valueEn}
            onChange={(e) => onChangeEn(e.target.value)}
            placeholder={placeholder ? `${placeholder} (${t("english")})` : t("english")}
          />
        </TabsContent>
        {onChangeFr && (
          <TabsContent value="fr" className="mt-2">
            <Input
              value={valueFr ?? ""}
              onChange={(e) => onChangeFr(e.target.value)}
              placeholder={placeholder ? `${placeholder} (${t("french")})` : t("french")}
            />
          </TabsContent>
        )}
        {onChangeDe && (
          <TabsContent value="de" className="mt-2">
            <Input
              value={valueDe ?? ""}
              onChange={(e) => onChangeDe(e.target.value)}
              placeholder={placeholder ? `${placeholder} (${t("german")})` : t("german")}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
