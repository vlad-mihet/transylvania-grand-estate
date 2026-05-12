import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { localeMetadata, type Locale } from "@tge/locale";
import { routing } from "@/i18n/routing";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
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
  const { dir } = localeMetadata[locale as Locale];

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster
            position="bottom-right"
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "font-sans text-sm border border-border bg-card text-foreground",
                title: "font-medium",
                description: "text-muted-foreground",
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
