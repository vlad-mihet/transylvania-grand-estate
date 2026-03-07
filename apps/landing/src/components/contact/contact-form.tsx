"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@tge/ui";
import { Textarea } from "@tge/ui";
import { Label } from "@tge/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { AccentButton } from "@tge/ui";
import { CheckCircle, Loader2 } from "lucide-react";
import { mutateApi } from "@/lib/api";

interface ContactFormProps {
  properties: { id: string; slug: string; title: { en: string } }[];
}

export function ContactForm({ properties }: ContactFormProps) {
  const t = useTranslations("ContactPage.form");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [budget, setBudget] = useState("");
  const [propertySlug, setPropertySlug] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    try {
      await mutateApi("/inquiries", {
        body: {
          type: "general",
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone") || undefined,
          message: formData.get("message"),
          budget: budget || undefined,
          propertySlug: propertySlug || undefined,
        },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="frosted-glass p-8 md:p-12 text-center">
        <CheckCircle className="h-16 w-16 text-copper mx-auto mb-6" />
        <h3 className="font-serif text-2xl text-cream mb-2">
          {t("success.title")}
        </h3>
        <p className="text-cream-muted">{t("success.message")}</p>
      </div>
    );
  }

  return (
    <div className="frosted-glass p-8 md:p-14">
      <h2 className="font-serif text-2xl text-cream mb-8 text-center">
        {t("title")}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-cream-muted">
              {t("fullName")}
            </Label>
            <Input
              id="name"
              name="name"
              required
              className="bg-white/5 border-copper/10 text-cream placeholder:text-cream-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-cream-muted">
              {t("email")}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              className="bg-white/5 border-copper/10 text-cream placeholder:text-cream-muted/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-cream-muted">
              {t("phone")}
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              className="bg-white/5 border-copper/10 text-cream placeholder:text-cream-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-cream-muted">{t("budget")}</Label>
            <Select value={budget} onValueChange={setBudget}>
              <SelectTrigger className="bg-white/5 border-copper/10 text-cream">
                <SelectValue placeholder={t("selectBudget")} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-copper/10">
                <SelectItem value="1-1.5">{t("budgetOptions.1to15")}</SelectItem>
                <SelectItem value="1.5-2">{t("budgetOptions.15to2")}</SelectItem>
                <SelectItem value="2-3">{t("budgetOptions.2to3")}</SelectItem>
                <SelectItem value="3+">{t("budgetOptions.3plus")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-cream-muted">{t("property")}</Label>
          <Select value={propertySlug} onValueChange={setPropertySlug}>
            <SelectTrigger className="bg-white/5 border-copper/10 text-cream">
              <SelectValue placeholder={t("selectProperty")} />
            </SelectTrigger>
            <SelectContent className="bg-popover border-copper/10">
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.slug}>
                  {p.title.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message" className="text-cream-muted">
            {t("message")}
          </Label>
          <Textarea
            id="message"
            name="message"
            rows={5}
            placeholder={t("messagePlaceholder")}
            className="bg-white/5 border-copper/10 text-cream placeholder:text-cream-muted/50 resize-none"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <AccentButton
          type="submit"
          className="w-full mt-3"
          size="lg"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("submit")
          )}
        </AccentButton>
      </form>
    </div>
  );
}
