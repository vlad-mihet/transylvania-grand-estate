import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies the public password-accept endpoint so the returned refresh token
 * lands in an httpOnly cookie on the admin origin. Mirrors the /api/auth/login
 * proxy — exactly the same cookie semantics, just a different upstream path.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiUrl = process.env.API_URL!;

  const res = await fetch(`${apiUrl}/invitations/accept/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const tokens = data?.data;
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

  response.cookies.set("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
