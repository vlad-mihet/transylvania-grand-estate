"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApiFormErrors } from "@/lib/form-error";
import { toast } from "@/lib/toast";
import { BilingualTextarea } from "@/components/shared/bilingual-textarea";
import { ImageUpload } from "@/components/shared/image-upload";
import { SectionCard } from "@/components/shared/section-card";
import { Button, Input, Label } from "@tge/ui";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Profile self-edit schema. Strict subset of the admin agent schema — no
 * slug, no email, no active toggle. The server enforces the same allow-list
 * in `agents.controller.ts` for AGENT role callers.
 */
const localizedBio = z
  .object({
    en: z.string().min(1),
    ro: z.string().min(1),
    fr: z.string().optional(),
    de: z.string().optional(),
  })
  .strict();

export const agentProfileSchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().min(1).max(50),
    bio: localizedBio,
  })
  .strict();

export type AgentProfileValues = z.infer<typeof agentProfileSchema>;

interface AgentProfileFormProps {
  defaultValues?: Partial<AgentProfileValues>;
  photoUrl?: string | null;
  onSubmit: (data: AgentProfileValues, photoFile: File | null) => void;
  loading?: boolean;
  submissionError?: unknown;
}

export function AgentProfileForm({
  defaultValues,
  photoUrl,
  onSubmit,
  loading,
  submissionError,
}: AgentProfileFormProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const t = useTranslations("Profile");
  const tag = useTranslations("AgentForm");
  const tc = useTranslations("Common");

  const form = useForm<AgentProfileValues>({
    resolver: zodResolver(agentProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      bio: { en: "", ro: "", fr: "", de: "" },
      ...defaultValues,
    },
  });

  useApiFormErrors(form, submissionError, (err) => {
    toast.error(err instanceof Error ? err.message : t("saveFailed"));
  });

  return (
    <form
      onSubmit={form.handleSubmit((data) => onSubmit(data, photoFile))}
      className="w-full space-y-5"
    >
      <SectionCard
        title={t("contactDetails")}
        description={t("contactDetailsDescription")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{tag("firstName")}</Label>
            <Input {...form.register("firstName")} />
          </div>
          <div className="space-y-1.5">
            <Label>{tag("lastName")}</Label>
            <Input {...form.register("lastName")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{tag("phone")}</Label>
            <Input {...form.register("phone")} className="mono" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t("bio")} description={t("bioDescription")}>
        <BilingualTextarea
          label={tag("bio")}
          valueEn={form.watch("bio.en")}
          valueRo={form.watch("bio.ro")}
          onChangeEn={(v) => form.setValue("bio.en", v)}
          onChangeRo={(v) => form.setValue("bio.ro", v)}
          valueFr={form.watch("bio.fr") ?? ""}
          valueDe={form.watch("bio.de") ?? ""}
          onChangeFr={(v) => form.setValue("bio.fr", v)}
          onChangeDe={(v) => form.setValue("bio.de", v)}
          required
        />
      </SectionCard>

      <SectionCard title={t("photo")} description={t("photoDescription")}>
        <ImageUpload
          label={tag("photo")}
          value={photoUrl}
          onChange={(file) => setPhotoFile(file)}
        />
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {tc("saving")}
            </>
          ) : (
            t("save")
          )}
        </Button>
      </div>
    </form>
  );
}
