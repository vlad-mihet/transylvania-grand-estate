import { NextRequest, NextResponse } from "next/server";
import { setAcademyRefreshCookie, upstreamApiUrl } from "../_helpers";

/**
 * Password-path invitation accept. Proxies to upstream
 * `/academy/auth/invitations/accept-password`, then lands the returned
 * refresh token as the httpOnly cookie so the user is signed in
 * post-acceptance with no further round-trip.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiUrl = upstreamApiUrl();

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/academy/auth/invitations/accept-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Site": "ACADEMY" },
      body: JSON.stringify(body),
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
