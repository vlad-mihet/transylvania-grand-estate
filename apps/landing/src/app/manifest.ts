import type { MetadataRoute } from "next";
import { getBrand } from "@tge/branding";

export default function manifest(): MetadataRoute.Manifest {
  const brand = getBrand();
  return {
    name: brand.name,
    short_name: brand.name,
    description: brand.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#141418",
    theme_color: "#c89a3c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
