import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getBrand } from "@tge/branding";
import type { Locale } from "@tge/types";

export const alt = "Reveria";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const brand = getBrand();
  const t = await getTranslations({ locale, namespace: "HomePage.hero" });
  const title = t("title");
  const subtitle = brand.tagline;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #5B21B6 0%, #7C3AED 55%, #A78BFA 100%)",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <span>Rever</span>
          <span style={{ color: "#F5F3FF" }}>ia</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 400,
              color: "rgba(255, 255, 255, 0.85)",
              maxWidth: 900,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
