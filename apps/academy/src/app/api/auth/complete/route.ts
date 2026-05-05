import { NextRequest, NextResponse } from "next/server";
import { setAcademyRefreshCookie, upstreamApiUrl } from "../_helpers";

/**
 * OAuth handoff. The Google callback page reads the refresh token from the
 * URL fragment (so it never lands in server logs), then POSTs it here. We
 * exchange it via upstream `/academy/auth/refresh` — that rotates the jti,
 * verifies the realm, and returns a fresh pair plus the user shape — and
 * land the new refresh token as the httpOnly cookie. Single round-trip
 * replaces the old fragment-→-localStorage handoff.
 */
export async function POST(req: NextRequest) {
  const { refreshToken } = (await req.json().catch(() => ({}))) as {
    refreshToken?: string;
  };
  if (!refreshToken || typeof refreshToken !== "string") {
    return NextResponse.json(
      { error: { message: "refreshToken required" } },
      { status: 400 },
    );
  }

  const apiUrl = upstreamApiUrl();

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/academy/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Site": "ACADEMY" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return NextResponse.json(
      { error: { message: "Auth service unavailable" } },
      { status: 503 },
    );
  }

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const tokens = data?.data ?? data;
  if (!tokens?.accessToken || !tokens?.refreshToken || !tokens?.user) {
    return NextResponse.json(
      { error: { message: "Invalid response from auth service" } },
      { status: 502 },
    );
  }

  const response = NextResponse.json({
    accessToken: tokens.accessToken,
    user: tokens.user,
  });
  setAcademyRefreshCookie(response, tokens.refreshToken);
  return response;
}
