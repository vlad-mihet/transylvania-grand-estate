import { Suspense } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { DM_Sans, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import { localeMetadata, type Locale } from "@tge/i18n";
import { Providers } from "@/components/providers";
import "../globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
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
  if (!hasLocale(routing.locales, locale)) notFound();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={localeMetadata[locale as Locale].dir}
      className={`${dmSans.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <div className="flex min-h-screen flex-col">
              {/*
                One stable Suspense boundary for the whole route. The auth pages
                read `useSearchParams()`, which Next requires be wrapped in
                Suspense; having it here (instead of a per-page
                `<Suspense fallback={null}>`) avoids a second, Next-injected
                segment boundary landing at the same slot and reconciling
                differently between server and client (BUG-212 hydration).
              */}
              <main className="flex-1">
                <Suspense>{children}</Suspense>
              </main>
            </div>
            <Toaster position="bottom-center" richColors closeButton />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
