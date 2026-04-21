import { NextRequest, NextResponse } from "next/server";

/**
 * Mirror of /api/invitations/accept/password \u2014 forwards the reset submission
 * upstream, then lands the returned refreshToken as an httpOnly cookie on
 * the admin origin so the user is immediately signed in post-reset.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiUrl = process.env.API_URL!;

  const res = await fetch(`${apiUrl}/auth/reset-password`, {
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
