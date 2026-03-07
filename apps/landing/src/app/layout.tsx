import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Transylvania Grand Estate",
    default: "Transylvania Grand Estate | Luxury Real Estate in Romania",
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
