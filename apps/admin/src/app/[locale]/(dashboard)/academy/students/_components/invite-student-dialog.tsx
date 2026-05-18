"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@tge/ui";
import { SingleInviteForm } from "./single-invite-form";
import { BulkInviteForm } from "./bulk-invite-form";

type Course = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
};

type Mode = "single" | "bulk";

interface InviteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  onSuccess: () => void;
}

export function InviteStudentDialog({
  open,
  onOpenChange,
  courses,
  onSuccess,
}: InviteStudentDialogProps) {
  const t = useTranslations("Academy.invite");
  const [mode, setMode] = useState<Mode>("single");

  // Reset to Single when closing so a previous Bulk session doesn't
  // surprise the next admin who just wants to invite one person.
  const handleOpenChange = (next: boolean) => {
    if (!next) setMode("single");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={mode === "bulk" ? "sm:max-w-2xl" : "sm:max-w-md"}
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as Mode)}
          className="w-full"
        >
          <TabsList className="h-8 w-full sm:w-fit">
            <TabsTrigger
              value="single"
              className="px-3 text-xs font-medium tracking-[0.06em]"
            >
              {t("modeSingle")}
            </TabsTrigger>
            <TabsTrigger
              value="bulk"
              className="px-3 text-xs font-medium tracking-[0.06em]"
            >
              {t("modeBulk")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "single" ? (
          <SingleInviteForm
            courses={courses}
            onCancel={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        ) : (
          <BulkInviteForm
            courses={courses}
            onCancel={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
