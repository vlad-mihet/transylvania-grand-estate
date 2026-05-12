"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@tge/ui";
import { useTranslations } from "next-intl";

import type { County } from "./columns";

interface CountyFormState {
  name: string;
  slug: string;
  code: string;
  latitude: string;
  longitude: string;
}

export interface CountyUpdatePayload {
  name?: string;
  slug?: string;
  code?: string;
  latitude?: number;
  longitude?: number;
}

interface EditCountyDialogProps {
  county: County | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, payload: CountyUpdatePayload) => void;
  isPending: boolean;
}

/**
 * Edit-county modal — mirrors `CreateCountyDialog` but seeds from an existing
 * row and sends only the fields that changed (PATCH semantics). Field-level
 * diffing means typo fixes don't accidentally reset coordinates that weren't
 * touched.
 */
export function EditCountyDialog({
  county,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: EditCountyDialogProps) {
  const t = useTranslations("Counties");
  const tc = useTranslations("Common");
  const [form, setForm] = useState<CountyFormState>({
    name: "",
    slug: "",
    code: "",
    latitude: "",
    longitude: "",
  });

  // Seed form whenever the dialog opens with a fresh county. Don't sync while
  // the user is typing — that would clobber edits if a background refetch
  // reseeded the parent's `county` prop.
  useEffect(() => {
    if (open && county) {
      setForm({
        name: county.name,
        slug: county.slug,
        code: county.code,
        latitude: String(county.latitude),
        longitude: String(county.longitude),
      });
    }
  }, [open, county]);

  const valid =
    form.name.trim().length >= 2 &&
    form.slug.trim().length >= 2 &&
    form.code.trim().length >= 1 &&
    !Number.isNaN(Number(form.latitude)) &&
    !Number.isNaN(Number(form.longitude));

  const handleSubmit = () => {
    if (!county) return;
    const payload: CountyUpdatePayload = {};
    const trimmedName = form.name.trim();
    const trimmedSlug = form.slug.trim();
    const trimmedCode = form.code.trim().toUpperCase();
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (trimmedName !== county.name) payload.name = trimmedName;
    if (trimmedSlug !== county.slug) payload.slug = trimmedSlug;
    if (trimmedCode !== county.code) payload.code = trimmedCode;
    if (lat !== county.latitude) payload.latitude = lat;
    if (lng !== county.longitude) payload.longitude = lng;
    onSubmit(county.id, payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editCounty")}</DialogTitle>
          <DialogDescription>{t("editCountyDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="county-edit-name">{t("fieldName")}</Label>
            <Input
              id="county-edit-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="county-edit-slug">{t("fieldSlug")}</Label>
            <Input
              id="county-edit-slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="mono"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="county-edit-code">{t("fieldCode")}</Label>
              <Input
                id="county-edit-code"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                maxLength={4}
                className="mono uppercase"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="county-edit-lat">{t("fieldLatitude")}</Label>
              <Input
                id="county-edit-lat"
                value={form.latitude}
                onChange={(e) =>
                  setForm({ ...form, latitude: e.target.value })
                }
                inputMode="decimal"
                className="mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="county-edit-lng">{t("fieldLongitude")}</Label>
              <Input
                id="county-edit-lng"
                value={form.longitude}
                onChange={(e) =>
                  setForm({ ...form, longitude: e.target.value })
                }
                inputMode="decimal"
                className="mono"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || isPending}>
            {isPending ? tc("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
