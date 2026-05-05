import { NextResponse } from "next/server";

/**
 * Shared helpers for the academy `/api/auth/*` route handlers — they all
 * proxy to the same upstream surface, set the same httpOnly cookie, and
 * resolve `API_URL` the same way, so collapse it into one helper module.
 */

export const ACADEMY_REFRESH_COOKIE = "academy_refresh";
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function upstreamApiUrl(): string {
  const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "API_URL or NEXT_PUBLIC_API_URL must be set for the academy /api/auth/* routes",
    );
  }
  return url;
}

export function setAcademyRefreshCookie(
  response: NextResponse,
  refreshToken: string,
): void {
  response.cookies.set(ACADEMY_REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}
