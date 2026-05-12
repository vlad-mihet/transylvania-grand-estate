import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@tge/i18n";

export const alt = "TGE Academy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Per-locale OG card for academy. Pulls the app name + tagline from the
 * Academy namespace and the brand pitch from the public shell — every
 * locale has these keys (Phase 5's shared-messages refactor enforces it).
 */
export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Academy" });
  const appName = t("appName");
  const tagline = t("tagline");
  const headline = t("publicShell.brand.headline");

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
            "linear-gradient(135deg, #312E81 0%, #4338CA 55%, #6366F1 100%)",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          <span>{appName}</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              maxWidth: 980,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              color: "rgba(255, 255, 255, 0.82)",
              maxWidth: 900,
            }}
          >
            {tagline}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
