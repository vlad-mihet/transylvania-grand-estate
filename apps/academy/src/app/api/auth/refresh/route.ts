import { NextRequest, NextResponse } from "next/server";
import {
  ACADEMY_REFRESH_COOKIE,
  setAcademyRefreshCookie,
  upstreamApiUrl,
} from "../_helpers";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(ACADEMY_REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
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
  if (!res.ok) {
    // Don't delete the cookie here. A 401 from the API can mean "this jti is
    // already revoked" — which happens if a concurrent /api/auth/refresh just
    // rotated it. The browser already has the rotated value via the parallel
    // call's `set-cookie`; clobbering it would kill the live session. If the
    // RT is genuinely expired, the next call fails again and the user re-
    // logs in.
    return NextResponse.json(data, { status: res.status });
  }

  const tokens = data?.data ?? data;
  if (!tokens?.accessToken || !tokens?.refreshToken || !tokens?.user) {
    const response = NextResponse.json(
      { error: { message: "Invalid response from auth service" } },
      { status: 502 },
    );
    response.cookies.delete(ACADEMY_REFRESH_COOKIE);
    return response;
  }

  const response = NextResponse.json({
    accessToken: tokens.accessToken,
    user: tokens.user,
  });
  setAcademyRefreshCookie(response, tokens.refreshToken);
  return response;
}
