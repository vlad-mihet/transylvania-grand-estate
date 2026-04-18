import type { Metadata } from "next";
import { getBrand } from "@tge/branding";

const brand = getBrand();

export const metadata: Metadata = {
  title: {
    template: `%s | ${brand.name}`,
    default: `${brand.name} | Find Your Perfect Home in Transylvania`,
  },
  description: brand.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
