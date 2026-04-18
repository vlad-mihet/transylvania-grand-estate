import { getTranslations } from "next-intl/server";
import type { Locale } from "@tge/types";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { ContactForm } from "@/components/contact/contact-form";
import { MapPin, Phone, Mail } from "lucide-react";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ContactPage" });
  return createMetadata({
    title: t("hero.title"),
    description: t("hero.subtitle"),
    path: "/contact",
    locale,
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("ContactPage");
  const tBreadcrumb = await getTranslations("Breadcrumb");

  return (
    <>
      <PageHeader
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        breadcrumbItems={[
          { label: tBreadcrumb("home"), href: "/" },
          { label: tBreadcrumb("contact") },
        ]}
        locale={locale}
      />

      <section className="pb-16 md:pb-24 bg-background">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 md:gap-10 lg:gap-16">
            <div className="lg:col-span-3">
              <h2 className="text-2xl font-bold text-foreground mb-6 md:mb-8">
                {t("form.title")}
              </h2>
              <ContactForm />
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-foreground mb-6 md:mb-8">
                {t("offices.title")}
              </h2>
              <div className="bg-card border border-border rounded-xl shadow-sm p-5 md:p-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium text-sm mb-1">
                      Cluj-Napoca
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Strada Memorandumului 28
                      <br />
                      Cluj-Napoca, Romania
                    </p>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium text-sm mb-1">
                      Phone
                    </p>
                    <a
                      href="tel:+40264000000"
                      className="text-muted-foreground text-sm hover:text-primary transition-colors"
                    >
                      +40 264 000 000
                    </a>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium text-sm mb-1">
                      Email
                    </p>
                    <a
                      href="mailto:hello@reveria.ro"
                      className="text-muted-foreground text-sm hover:text-primary transition-colors"
                    >
                      hello@reveria.ro
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
