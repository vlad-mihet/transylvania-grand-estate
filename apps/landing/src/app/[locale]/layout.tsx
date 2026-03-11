import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Playfair_Display, Inter } from "next/font/google";
import { routing } from "@tge/i18n/routing";
import { fetchApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { InquiryProvider, InquiryModal } from "@/components/inquiry";
import "../globals.css";

const playfair = Playfair_Display({
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

  let developers: { name: string; slug: string }[] = [];
  try {
    developers = await fetchApi<{ name: string; slug: string }[]>("/developers");
  } catch {
    // fallback to empty — nav still works without developer links
  }

  return (
    <html lang={locale} className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <InquiryProvider>
            <Header developers={developers} />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <InquiryModal />
          </InquiryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
