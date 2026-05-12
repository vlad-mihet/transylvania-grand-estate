import type { Metadata } from "next";
import { BRAND } from "@/lib/config/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND.shortName} ${BRAND.productName}`,
  description: `${BRAND.name} — ${BRAND.productName}`,
};

// Provider-only passthrough. `<html>` / `<body>` live in the [locale] layout
// so `lang` and `dir` are driven by the resolved locale rather than a stale
// `"ro"` literal. Root-level pages (not-found, global-error) render their
// own `<html>` / `<body>` per Next's contract.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
