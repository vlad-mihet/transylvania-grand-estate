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

  const res = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await res.json();

  if (!res.ok) {
    const response = NextResponse.json(data, { status: res.status });
    // Clear invalid cookie
    response.cookies.delete("refreshToken");
    return response;
  }

  const response = NextResponse.json({
    accessToken: data.data.accessToken,
    user: data.data.user,
  });

  // Update refresh token cookie
  response.cookies.set("refreshToken", data.data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
