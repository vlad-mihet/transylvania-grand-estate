"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Textarea,
  AccentButton,
} from "@tge/ui";
import { useInquiryModal } from "./inquiry-context";
import { mutateApi } from "@/lib/api";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export function InquiryModal() {
  const { isOpen, context, closeInquiry } = useInquiryModal();
  const t = useTranslations("InquiryModal");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");

    const formData = new FormData(e.currentTarget);

    try {
      await mutateApi("/inquiries", {
        body: {
          type: context.type,
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          entityName: context.entityName,
          entitySlug: context.entitySlug,
        },
      });
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeInquiry();
      setTimeout(() => {
        setStatus("idle");
        setErrorMessage("");
      }, 300);
    }
  };

  const title =
    context.type === "property" && context.entityName
      ? t("titleProperty", { name: context.entityName })
      : context.type === "developer" && context.entityName
        ? t("titleDeveloper", { name: context.entityName })
        : t("titleGeneral");

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-background border-copper/10 sm:max-w-md"
        overlayClassName="bg-black/70 backdrop-blur-sm"
      >
        {status === "success" ? (
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-copper mx-auto mb-4" />
            <DialogTitle className="font-serif text-xl text-cream mb-2">
              {t("success.title")}
            </DialogTitle>
            <p className="text-cream-muted text-sm">{t("success.message")}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl text-cream">
                {title}
              </DialogTitle>
              <DialogDescription className="text-cream-muted text-sm">
                {t("description")}
              </DialogDescription>
            </DialogHeader>

            {context.entityName && (
              <div className="text-xs text-copper bg-copper/5 border border-copper/10 rounded-md px-3 py-2">
                {context.type === "property"
                  ? t("regarding")
                  : t("about")}{" "}
                <span className="font-medium">{context.entityName}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="inquiry-name"
                  className="text-cream-muted text-sm"
                >
                  {t("name")}
                </Label>
                <Input
                  id="inquiry-name"
                  name="name"
                  required
                  className="bg-white/5 border-copper/10 text-cream placeholder:text-cream-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="inquiry-email"
                  className="text-cream-muted text-sm"
                >
                  {t("email")}
                </Label>
                <Input
                  id="inquiry-email"
                  name="email"
                  type="email"
                  required
                  className="bg-white/5 border-copper/10 text-cream placeholder:text-cream-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="inquiry-message"
                  className="text-cream-muted text-sm"
                >
                  {t("message")}
                </Label>
                <Textarea
                  id="inquiry-message"
                  name="message"
                  required
                  minLength={10}
                  rows={4}
                  placeholder={t("messagePlaceholder")}
                  className="bg-white/5 border-copper/10 text-cream placeholder:text-cream-muted/50 resize-none"
                />
              </div>

              {status === "error" && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMessage || t("error")}
                </div>
              )}

              <AccentButton
                type="submit"
                className="w-full"
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("submit")
                )}
              </AccentButton>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
