"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Button, Input } from "@tge/ui";
import { Loader2 } from "lucide-react";
import {
  EntryEditorShell,
  EntryLocaleProvider,
  LocalizedTextarea,
  MetaField,
  useLocaleCompleteness,
} from "@/components/entry-editor";
import { ImageUpload } from "@/components/shared/image-upload";
import { useApiFormErrors } from "@tge/hooks";
import { toast } from "@/lib/toast";

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
  title: ReactNode;
  breadcrumb?: ReactNode;
}

export function AgentProfileForm({
  defaultValues,
  photoUrl,
  onSubmit,
  loading,
  submissionError,
  title,
  breadcrumb,
}: AgentProfileFormProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const t = useTranslations("Profile");

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
    <FormProvider {...form}>
      <EntryLocaleProvider>
        <form onSubmit={form.handleSubmit((data) => onSubmit(data, photoFile))}>
          <AgentProfileBody
            loading={loading}
            dirty={form.formState.isDirty}
            photoUrl={photoUrl}
            onPhotoFileChange={setPhotoFile}
            title={title}
            breadcrumb={breadcrumb}
          />
        </form>
      </EntryLocaleProvider>
    </FormProvider>
  );
}

interface BodyProps {
  loading?: boolean;
  dirty: boolean;
  photoUrl?: string | null;
  onPhotoFileChange: (file: File | null) => void;
  title: ReactNode;
  breadcrumb?: ReactNode;
}

function AgentProfileBody({
  loading,
  dirty,
  photoUrl,
  onPhotoFileChange,
  title,
  breadcrumb,
}: BodyProps) {
  const t = useTranslations("Profile");
  const tag = useTranslations("AgentForm");
  const tc = useTranslations("Common");
  const { completeness, errorCounts } = useLocaleCompleteness<AgentProfileValues>(
    ["bio"],
  );

  return (
    <EntryEditorShell
      title={title}
      breadcrumb={breadcrumb}
      unsavedDirty={dirty}
      switcherCompleteness={completeness}
      switcherErrorCounts={errorCounts}
      actions={
        <Button type="submit" size="sm" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              {tc("saving")}
            </>
          ) : (
            t("save")
          )}
        </Button>
      }
      localizedFields={
        <LocalizedTextarea<AgentProfileValues>
          name="bio"
          label={tag("bio")}
          required
          rows={8}
        />
      }
      extraSection={
        <div>
          <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
            {tag("photo")}
          </p>
          <ImageUpload value={photoUrl} onChange={onPhotoFileChange} />
        </div>
      }
      metadataFields={<ProfileMetadataFields tag={tag} />}
    />
  );
}

function ProfileMetadataFields({
  tag,
}: {
  tag: ReturnType<typeof useTranslations>;
}) {
  const form = useFormContext<AgentProfileValues>();
  return (
    <>
      <MetaField id="profile-first-name" label={tag("firstName")}>
        <Input id="profile-first-name" {...form.register("firstName")} />
      </MetaField>
      <MetaField id="profile-last-name" label={tag("lastName")}>
        <Input id="profile-last-name" {...form.register("lastName")} />
      </MetaField>
      <MetaField id="profile-phone" label={tag("phone")}>
        <Input id="profile-phone" {...form.register("phone")} className="mono" />
      </MetaField>
    </>
  );
}
