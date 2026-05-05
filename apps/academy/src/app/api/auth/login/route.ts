import { NextRequest, NextResponse } from "next/server";
import { setAcademyRefreshCookie, upstreamApiUrl } from "../_helpers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiUrl = upstreamApiUrl();

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/academy/auth/login`, {
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
