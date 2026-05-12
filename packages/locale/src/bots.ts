// Crawler User-Agent allowlist. Search bots must NOT be locale-negotiated
// at the unprefixed root — Google explicitly asks crawlers be served the
// default and discover each locale URL directly via hreflang. False
// negatives are fine: a missed bot just sees the RO default, same as a
// first-time human visitor with no Accept-Language. False positives are
// what we guard against (don't catch real users).
//
// Sourced from common crawler patterns; intentionally short and easy to
// extend rather than exhaustive.
const CRAWLER_TOKENS = [
  "googlebot",
  "bingbot",
  "baiduspider",
  "yandexbot",
  "duckduckbot",
  "slurp", // Yahoo
  "ahrefsbot",
  "semrushbot",
  "applebot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "petalbot",
  "mj12bot",
] as const;

export function isCrawlerUA(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  for (const token of CRAWLER_TOKENS) {
    if (ua.includes(token)) return true;
  }
  return false;
}
