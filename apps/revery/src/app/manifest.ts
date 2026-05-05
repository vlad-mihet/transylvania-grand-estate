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
    background_color: "#FFFFFF",
    theme_color: "#7C3AED",
  };
}
