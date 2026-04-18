"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Phone, Loader2, Check } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
} from "@tge/ui";
import { useInquirySubmission } from "@tge/hooks";
import { getBrand } from "@tge/branding";

interface AgentSummary {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  photo?: string;
}

interface PropertyContactCardProps {
  agent: AgentSummary | null;
  propertyTitle: string;
  propertySlug: string;
  defaultMessage: string;
}

function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return "••• ••• •••";
  return `${trimmed.slice(0, 4)} ••• •••`;
}

function RequiredLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-xs font-medium">
      <span>{children}</span>
      <span className="text-destructive ml-0.5">*</span>
    </Label>
  );
}

export function PropertyContactCard({
  agent,
  propertyTitle,
  propertySlug,
  defaultMessage,
}: PropertyContactCardProps) {
  const t = useTranslations("PropertyDetail");

  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const {
    submit,
    isSubmitting: submitting,
    isSuccess: submitted,
    error,
  } = useInquirySubmission({
    type: "property",
    sourceSuffix: "property-detail",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    await submit({
      name,
      email,
      phone: phone ? `+40${phone.replace(/\s/g, "")}` : undefined,
      message,
      entityName: propertyTitle,
      entitySlug: propertySlug,
      propertySlug,
    });
  };

  const agentDisplayName = agent
    ? `${agent.firstName} ${agent.lastName}`
    : getBrand().name;
  const agentSubline = agent ? t("agent.roleAgent") : t("agent.roleTeam");

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-5 md:p-6">
        {/* Agent header */}
        <div className="flex items-center gap-3">
          {agent?.photo ? (
            <Image
              src={agent.photo}
              alt={agentDisplayName}
              width={40}
              height={40}
              className="rounded-full object-cover w-10 h-10 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-accent text-primary font-semibold text-sm flex items-center justify-center shrink-0">
              {agentDisplayName[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-foreground font-bold text-base leading-tight">
              {agentDisplayName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {agentSubline}
            </p>
          </div>
        </div>

        {/* Phone row with reveal */}
        {agent && (
          <div className="mt-4 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full border border-border flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4 text-primary" />
            </span>
            {phoneRevealed ? (
              <a
                href={`tel:${agent.phone}`}
                className="text-foreground font-semibold tracking-wide hover:text-primary transition-colors"
              >
                {agent.phone}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setPhoneRevealed(true)}
                className="flex flex-col items-start text-left"
              >
                <span className="text-foreground font-semibold tracking-wide">
                  {maskPhone(agent.phone)}
                </span>
                <span className="text-xs text-primary hover:underline">
                  {t("viewPhone")}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Inline form */}
        <div className="mt-5">
          {submitted ? (
            <div className="flex items-start gap-2 text-sm text-primary rounded-lg bg-primary/5 p-3">
              <Check className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t("inlineInquiry.thanks")}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <RequiredLabel htmlFor="quick-name">
                  {t("inlineInquiry.name")}
                </RequiredLabel>
                <Input
                  id="quick-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={submitting}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <RequiredLabel htmlFor="quick-email">
                  {t("inlineInquiry.email")}
                </RequiredLabel>
                <Input
                  id="quick-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quick-phone" className="text-xs font-medium">
                  {t("inlineInquiry.phone")}
                </Label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    +40
                  </span>
                  <Input
                    id="quick-phone"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/[^0-9\s]/g, ""))
                    }
                    placeholder="7xx xxx xxx"
                    disabled={submitting}
                    className="h-11 rounded-l-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <RequiredLabel htmlFor="quick-message">
                  {t("inlineInquiry.message")}
                </RequiredLabel>
                <Textarea
                  id="quick-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  disabled={submitting}
                  className="resize-none"
                />
              </div>
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <p className="text-[11px] text-muted-foreground leading-snug">
                {t("inlineInquiry.privacy")}
              </p>
              <Button
                type="submit"
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t("inlineInquiry.send")
                )}
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
