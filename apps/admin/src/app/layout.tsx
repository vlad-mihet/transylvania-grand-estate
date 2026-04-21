import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { BRAND } from "@/lib/config/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: `${BRAND.shortName} ${BRAND.productName}`,
  description: `${BRAND.name} — ${BRAND.productName}`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans`}
        suppressHydrationWarning
      >
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
      </body>
    </html>
  );
}
