import { NextRequest, NextResponse } from "next/server";

/**
 * Accepts a refresh token from the OAuth handoff page (the token arrived
 * via URL fragment from the API callback, never hitting server logs), and
 * sets it as an httpOnly cookie on the admin origin. After this, the
 * AuthProvider's standard `/api/auth/refresh` flow works the same as for a
 * password-login user.
 *
 * We don't verify the token here — a forged JWT couldn't survive the
 * upstream /auth/refresh verification (which checks JWT_REFRESH_SECRET), so
 * handing it a junk cookie just breaks the attacker's own session.
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

  const response = NextResponse.json({ ok: true });
  response.cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
