"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Container } from "./container";
import { siteConfig } from "@/data/site-config";
import { Locale } from "@/types/property";
import { Instagram, Facebook, Linkedin, Youtube, Phone, Mail } from "lucide-react";

const socialIcons = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
};

export function Footer() {
  const t = useTranslations("Footer");
  const tNav = useTranslations("Navigation");
  const locale = useLocale() as Locale;

  return (
    <footer className="bg-[#101014] border-t border-copper/10">
      <Container className="py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <Link href="/" className="block mb-4">
              <span className="font-serif text-xl text-cream">
                Transylvania
                <span className="text-copper"> Grand Estate</span>
              </span>
            </Link>
            <p className="text-cream-muted text-sm leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          <div>
            <h3 className="font-serif text-lg text-cream mb-4">
              {t("quickLinks")}
            </h3>
            <nav className="flex flex-col gap-2">
              {(["home", "properties", "about", "contact"] as const).map(
                (key) => (
                  <Link
                    key={key}
                    href={
                      key === "home"
                        ? "/"
                        : `/${key}`
                    }
                    className="text-cream-muted text-sm hover:text-copper transition-colors"
                  >
                    {tNav(key)}
                  </Link>
                )
              )}
            </nav>
          </div>

          <div>
            <h3 className="font-serif text-lg text-cream mb-4">
              {t("contact")}
            </h3>
            <div className="flex flex-col gap-3 text-sm text-cream-muted">
              <a
                href={`tel:${siteConfig.contact.phone}`}
                className="flex items-center gap-2 hover:text-copper transition-colors"
              >
                <Phone className="h-4 w-4 text-copper" />
                {siteConfig.contact.phone}
              </a>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="flex items-center gap-2 hover:text-copper transition-colors"
              >
                <Mail className="h-4 w-4 text-copper" />
                {siteConfig.contact.email}
              </a>
              <p className="mt-2">
                {siteConfig.offices[0].address[locale]}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-serif text-lg text-cream mb-4">
              {t("followUs")}
            </h3>
            <div className="flex gap-3">
              {siteConfig.socialLinks.map((social) => {
                const Icon = socialIcons[social.platform];
                return (
                  <a
                    key={social.platform}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-copper/15 text-cream-muted/60 hover:text-copper hover:border-copper/30 hover:shadow-[0_0_12px_-3px_rgba(196,127,90,0.2)] transition-all duration-300"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </Container>

      <div className="border-t border-copper/10">
        <Container className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-cream-muted text-xs">
            {t("copyright", { year: new Date().getFullYear().toString() })}
          </p>
          <div className="flex gap-4 text-xs text-cream-muted">
            <span className="hover:text-copper transition-colors cursor-pointer">
              {t("privacy")}
            </span>
            <span className="hover:text-copper transition-colors cursor-pointer">
              {t("terms")}
            </span>
          </div>
        </Container>
      </div>
    </footer>
  );
}
