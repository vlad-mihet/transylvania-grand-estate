import { NextRequest, NextResponse } from "next/server";
import { setAcademyRefreshCookie, upstreamApiUrl } from "../_helpers";

/**
 * Academy register. The upstream response is a discriminated union: either
 * `{ ok, verificationRequired: true }` (the user must confirm via email) or
 * `{ ok, verificationRequired: false, accessToken, refreshToken, user }`
 * (auto-login branch when EMAIL_VERIFICATION_DISABLED=1). We set the cookie
 * only in the second case; otherwise the response is forwarded unchanged.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiUrl = upstreamApiUrl();

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/academy/auth/register`, {
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

  const payload = data?.data ?? data;
  if (payload?.verificationRequired === false) {
    if (!payload?.accessToken || !payload?.refreshToken || !payload?.user) {
      return NextResponse.json(
        { error: { message: "Invalid response from auth service" } },
        { status: 502 },
      );
    }
    const response = NextResponse.json({
      ok: true,
      verificationRequired: false,
      accessToken: payload.accessToken,
      user: payload.user,
    });
    setAcademyRefreshCookie(response, payload.refreshToken);
    return response;
  }

  return NextResponse.json({ ok: true, verificationRequired: true });
}
