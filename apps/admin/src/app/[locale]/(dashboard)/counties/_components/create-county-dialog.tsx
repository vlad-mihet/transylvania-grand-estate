"use client";

import { useState } from "react";
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

interface CountyFormState {
  name: string;
  slug: string;
  code: string;
  latitude: string;
  longitude: string;
}

const EMPTY: CountyFormState = {
  name: "",
  slug: "",
  code: "",
  latitude: "",
  longitude: "",
};

export interface CountyCreatePayload {
  name: string;
  slug: string;
  code: string;
  latitude: number;
  longitude: number;
}

interface CreateCountyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CountyCreatePayload) => void;
  isPending: boolean;
}

/**
 * Create-county modal. Owns form state + validation; parent supplies only
 * the submit handler. Numeric latitude/longitude are kept as strings in
 * local state (so the inputs feel natural) and coerced on submit.
 */
export function CreateCountyDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateCountyDialogProps) {
  const t = useTranslations("Counties");
  const tc = useTranslations("Common");
  const [form, setForm] = useState<CountyFormState>(EMPTY);

  const valid =
    form.name.trim().length >= 2 &&
    form.slug.trim().length >= 2 &&
    form.code.trim().length >= 2 &&
    !Number.isNaN(Number(form.latitude)) &&
    !Number.isNaN(Number(form.longitude));

  const handleOpenChange = (next: boolean) => {
    if (!next) setForm(EMPTY);
    onOpenChange(next);
  };

  const handleSubmit = () => {
    onSubmit({
      name: form.name.trim(),
      slug: form.slug.trim(),
      code: form.code.trim().toUpperCase(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("newCounty")}</DialogTitle>
          <DialogDescription>{t("newCountyDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="county-name">{t("fieldName")}</Label>
            <Input
              id="county-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Mureș"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="county-slug">{t("fieldSlug")}</Label>
            <Input
              id="county-slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="mures"
              className="mono"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="county-code">{t("fieldCode")}</Label>
              <Input
                id="county-code"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="MS"
                maxLength={3}
                className="mono uppercase"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="county-lat">{t("fieldLatitude")}</Label>
              <Input
                id="county-lat"
                value={form.latitude}
                onChange={(e) =>
                  setForm({ ...form, latitude: e.target.value })
                }
                placeholder="46.54"
                inputMode="decimal"
                className="mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="county-lng">{t("fieldLongitude")}</Label>
              <Input
                id="county-lng"
                value={form.longitude}
                onChange={(e) =>
                  setForm({ ...form, longitude: e.target.value })
                }
                placeholder="24.56"
                inputMode="decimal"
                className="mono"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!valid || isPending}
          >
            {isPending ? tc("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
