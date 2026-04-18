"use client";

import { useTranslations } from "next-intl";
import { Link } from "@tge/i18n/navigation";
import { Container } from "./container";
import { Instagram, Facebook, Linkedin, Youtube, Phone, Mail } from "lucide-react";

const socialLinks = [
  { platform: "instagram" as const, icon: Instagram, url: "https://instagram.com/reveria" },
  { platform: "facebook" as const, icon: Facebook, url: "https://facebook.com/reveria" },
  { platform: "linkedin" as const, icon: Linkedin, url: "https://linkedin.com/company/reveria" },
  { platform: "youtube" as const, icon: Youtube, url: "https://youtube.com/@reveria" },
];

const contact = {
  phone: "+40 264 123 456",
  email: "contact@reveria.ro",
};

export function Footer() {
  const t = useTranslations("Footer");
  const tNav = useTranslations("Navigation");

  return (
    <footer className="bg-background border-t border-border">
      <Container className="py-10 md:py-12 lg:py-14">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 md:gap-6">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-1">
            <Link href="/" className="block mb-3">
              <span className="text-xl font-bold tracking-tight">
                Rever<span className="text-primary">ia</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              {t("quickLinks")}
            </h3>
            <nav className="flex flex-col gap-2">
              {([
                { key: "home", href: "/" },
                { key: "properties", href: "/properties" },
                { key: "about", href: "/about" },
                { key: "contact", href: "/contact" },
              ] as const).map(({ key, href }) => (
                <Link
                  key={key}
                  href={href}
                  className="text-muted-foreground text-sm hover:text-primary transition-colors"
                >
                  {tNav(key)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              {t("explore")}
            </h3>
            <nav className="flex flex-col gap-2">
              {([
                { label: "cities", href: "/cities" },
                { label: "developers", href: "/developers" },
                { label: "agents", href: "/agents" },
                { label: "blog", href: "/blog" },
              ] as const).map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="text-muted-foreground text-sm hover:text-primary transition-colors"
                >
                  {t(`exploreLinks.${label}`)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              {t("resources")}
            </h3>
            <nav className="flex flex-col gap-2">
              {([
                { label: "faq", href: "/faq" },
                { label: "contact", href: "/contact" },
                { label: "tools", href: "/instrumente" },
              ] as const).map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="text-muted-foreground text-sm hover:text-primary transition-colors"
                >
                  {t(`resourceLinks.${label}`)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              {t("contact")}
            </h3>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                <Phone className="h-4 w-4" />
                {contact.phone}
              </a>
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="h-4 w-4" />
                {contact.email}
              </a>
            </div>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              {t("followUs")}
            </h3>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.platform}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </Container>

      <div className="border-t border-border">
        <Container className="py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            {t("copyright", { year: new Date().getFullYear().toString() })}
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="hover:text-primary transition-colors cursor-pointer">{t("privacy")}</span>
            <span className="hover:text-primary transition-colors cursor-pointer">{t("terms")}</span>
            <span className="hover:text-primary transition-colors cursor-pointer">{t("cookies")}</span>
          </div>
        </Container>
      </div>
    </footer>
  );
}
