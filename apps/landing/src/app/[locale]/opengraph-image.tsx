import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getBrand } from "@tge/branding";
import type { Locale } from "@tge/i18n";

export const alt = "Transylvania Grand Estate";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LOGO_DATA_URL = `data:image/png;base64,${readFileSync(
  path.join(process.cwd(), "public", "logo-640w.png")
).toString("base64")}`;

/**
 * Per-locale OG card. Generated at request time by Next's `next/og`
 * renderer; the convention-based filename `opengraph-image.tsx` under
 * `[locale]/` makes Next serve this at `/{locale}/opengraph-image` for
 * social-share fallback. `createMetadata` in `lib/seo.ts` points
 * `openGraph.images` here when a page doesn't provide an explicit image.
 *
 * Gold-on-dark palette mirrors the landing hero. Title pulls from
 * `HomePage.hero.title` so the card text matches whatever the homepage
 * leads with in that locale.
 */
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
            "linear-gradient(135deg, #141418 0%, #1F1F26 55%, #2A2530 100%)",
          color: "#F0EDE8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_DATA_URL}
            alt="Transylvania Grand Estate"
            width={280}
            height={153}
          />
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
              fontWeight: 500,
              fontFamily: "serif",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 400,
              color: "rgba(240, 237, 232, 0.7)",
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
