import type { Metadata } from "next";
import { getBrand } from "@tge/branding";

const brand = getBrand();

export const metadata: Metadata = {
  title: {
    template: `%s | ${brand.name}`,
    default: `${brand.name} | Luxury Real Estate in Romania`,
  },
  description:
    "Discover exceptional luxury properties across Romania's most prestigious addresses. Villas, mansions, and estates from €1M+ in Cluj-Napoca, Oradea, Timisoara, Brasov, and Sibiu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
