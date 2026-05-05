import { NextRequest, NextResponse } from "next/server";
import { ACADEMY_REFRESH_COOKIE, upstreamApiUrl } from "../_helpers";

/**
 * Best-effort revocation upstream, then clear the cookie locally. The
 * cookie is deleted unconditionally so the UX never stalls on an API hiccup.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(ACADEMY_REFRESH_COOKIE)?.value;
  const apiUrl = upstreamApiUrl();

  if (refreshToken) {
    try {
      await fetch(`${apiUrl}/academy/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Site": "ACADEMY" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      /* swallow — best-effort */
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACADEMY_REFRESH_COOKIE);
  return response;
}
