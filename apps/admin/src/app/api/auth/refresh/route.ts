import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refreshToken")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: "No refresh token" },
      { status: 401 },
    );
  }

  const apiUrl = process.env.API_URL!;

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    // already revoked" — which happens if a concurrent /auth/refresh just
    // rotated it (the API enforces single-use rotation as of Wave 1). The
    // browser already has the rotated value via the parallel call's
    // `set-cookie`; clobbering it would kill the live session. If the RT is
    // genuinely expired, the next call fails again and the user re-logs in.
    return NextResponse.json(data, { status: res.status });
  }

  const tokens = data?.data;
  if (!tokens?.accessToken || !tokens?.refreshToken || !tokens?.user) {
    const response = NextResponse.json(
      { error: { message: "Invalid response from auth service" } },
      { status: 502 },
    );
    response.cookies.delete("refreshToken");
    return response;
  }

  const response = NextResponse.json({
    accessToken: tokens.accessToken,
    user: tokens.user,
  });

  // Update refresh token cookie
  response.cookies.set("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
