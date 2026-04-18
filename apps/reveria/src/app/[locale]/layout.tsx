import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { DM_Sans, Inter } from "next/font/google";
import { routing } from "@/i18n/routing";
import type { Locale } from "@tge/types";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { InquiryProvider, InquiryModal } from "@tge/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationSchema, websiteSchema } from "@/lib/jsonld";
import { AxeInitializer } from "@/components/dev/axe-initializer";
import "../globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const tNav = await getTranslations({ locale, namespace: "Navigation" });

  return (
    <html lang={locale} className={`${dmSans.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        <JsonLd schema={[organizationSchema(), websiteSchema(locale as Locale)]} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[1200] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {tNav("skipToMain")}
        </a>
        <NextIntlClientProvider messages={messages}>
          <InquiryProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main id="main-content" className="flex-1">{children}</main>
              <Footer />
            </div>
            <InquiryModal />
          </InquiryProvider>
        </NextIntlClientProvider>
        {process.env.NODE_ENV === "development" && <AxeInitializer />}
      </body>
    </html>
  );
}
