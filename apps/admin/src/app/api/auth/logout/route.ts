import { NextRequest, NextResponse } from "next/server";

/**
 * Best-effort revocation upstream, then clear the cookie locally.
 *
 * We POST the cookie's refresh token to the API's /auth/logout so the jti
 * lands in the denylist \u2014 a stolen copy of the token won't refresh after
 * this point. If the upstream call fails (API down, network blip) we still
 * clear the cookie locally; the user's next action will fail their session
 * anyway, and the denylist will catch up when we next have a live path.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refreshToken")?.value;
  const apiUrl = process.env.API_URL;

  if (refreshToken && apiUrl) {
    try {
      await fetch(`${apiUrl}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Swallow: revocation is best-effort. The cookie is cleared below
      // unconditionally so the UX doesn't stall on an API hiccup.
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("refreshToken");
  return response;
}
