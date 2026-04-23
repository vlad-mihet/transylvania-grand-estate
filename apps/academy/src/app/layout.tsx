import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | TGE Academy",
    default: "TGE Academy",
  },
  description: "Study platform for real-estate agents",
  applicationName: "TGE Academy",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5b21b6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
