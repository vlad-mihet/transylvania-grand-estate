import type { Metadata, Viewport } from "next";
import { getBrand } from "@tge/branding";
import { SITE_URL } from "@/lib/seo";

const brand = getBrand();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s | ${brand.name}`,
    default: `${brand.name} | Find Your Perfect Home in Transylvania`,
  },
  description: brand.tagline,
  applicationName: brand.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7C3AED",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
