"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, setAccessToken } from "@/lib/api-client";
import { qk } from "./query-keys";
import type { Profile } from "./queries";

type AuthSession = {
  accessToken: string;
  user: { id: string; email: string; name: string };
};

/**
 * Mirrors the API's `academyRegisterResponseSchema` after the BFF strips
 * the refresh token (which is set as an httpOnly cookie). Auto-login branch
 * appears only when the upstream API was started with
 * `EMAIL_VERIFICATION_DISABLED=1`.
 */
type RegisterResponse =
  | { ok: true; verificationRequired: true }
  | {
      ok: true;
      verificationRequired: false;
      accessToken: string;
      user: { id: string; email: string; name: string };
    };

/**
 * BFF helper. The auth endpoints that mint or rotate sessions all live
 * behind Next route handlers under `/api/auth/*` so the refresh token can
 * be set as an httpOnly cookie on the academy origin. Direct calls to the
 * upstream API would leave the refresh token in the response body and
 * force the client to put it in localStorage — which is exactly what this
 * migration replaces.
 */
async function bffFetch<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: { message?: string }; message?: string })?.error
        ?.message ??
      (data as { message?: string })?.message ??
      `Request failed: ${res.status}`;
    throw new BffError(message, res.status);
  }
  return data as T;
}

class BffError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

/* ───── Auth ───── */

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      bffFetch<AuthSession>("/api/auth/login", body),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      qc.setQueryData(qk.me(), data.user as unknown as Profile);
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      email: string;
      password: string;
      locale: "ro" | "en" | "fr" | "de";
    }) => bffFetch<RegisterResponse>("/api/auth/register", body),
    onSuccess: (data) => {
      // Auto-login branch (API runs with EMAIL_VERIFICATION_DISABLED=1).
      // Branching on the response shape rather than a frontend env var
      // keeps the two sides from drifting.
      if (data.verificationRequired === false) {
        setAccessToken(data.accessToken);
        qc.setQueryData(qk.me(), data.user as unknown as Profile);
      }
    },
  });
}

export function useVerifyEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { token: string }) =>
      bffFetch<AuthSession>("/api/auth/verify-email", body),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      qc.setQueryData(qk.me(), data.user as unknown as Profile);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: { email: string }) =>
      apiFetch<{ ok: true }>("/academy/auth/forgot-password", {
        method: "POST",
        body,
        skipAuth: true,
      }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: { token: string; password: string }) =>
      apiFetch<{ ok: true }>("/academy/auth/reset-password", {
        method: "POST",
        body,
        skipAuth: true,
      }),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (body: { email: string }) =>
      apiFetch<{ ok: true }>("/academy/auth/resend-verification", {
        method: "POST",
        body,
        skipAuth: true,
      }),
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { token: string; password: string }) =>
      bffFetch<AuthSession>("/api/auth/accept-invite", body),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      qc.setQueryData(qk.me(), data.user as unknown as Profile);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Best-effort upstream revocation happens inside the BFF route. The
      // cookie is cleared regardless so a network blip can't strand the
      // user in a half-logged-out state.
      await bffFetch<{ ok: boolean }>("/api/auth/logout").catch(
        () => undefined,
      );
      setAccessToken(null);
    },
    onSuccess: () => {
      qc.clear();
    },
  });
}

/* ───── Profile ───── */

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; locale?: Profile["locale"] }) =>
      apiFetch<Profile>("/academy/auth/me", { method: "PATCH", body }),
    onSuccess: (profile) => {
      qc.setQueryData(qk.me(), profile);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      apiFetch<{ ok: boolean }>("/academy/auth/change-password", {
        method: "POST",
        body,
      }),
  });
}

/* ───── Enrollment / Progress ───── */

export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, locale }: { slug: string; locale: string }) =>
      apiFetch<{ enrolled: boolean }>(
        `/academy/courses/${encodeURIComponent(slug)}/enroll`,
        { method: "POST", locale },
      ),
    onSuccess: (_, { slug }) => {
      qc.invalidateQueries({ queryKey: ["academy", "my-courses"] });
      qc.invalidateQueries({ queryKey: ["academy", "course", slug] });
      qc.invalidateQueries({ queryKey: ["academy", "catalog"] });
    },
  });
}

export function useUnenroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, locale }: { slug: string; locale: string }) =>
      apiFetch(`/academy/courses/${encodeURIComponent(slug)}/enroll`, {
        method: "DELETE",
        locale,
      }),
    onSuccess: (_, { slug }) => {
      qc.invalidateQueries({ queryKey: ["academy", "my-courses"] });
      qc.invalidateQueries({ queryKey: ["academy", "course", slug] });
    },
  });
}

export function useCompleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      lessonSlug,
      locale,
    }: {
      slug: string;
      lessonSlug: string;
      locale: string;
    }) =>
      apiFetch(
        `/academy/courses/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(lessonSlug)}/complete`,
        { method: "POST", locale },
      ),
    onSuccess: (_, { slug }) => {
      qc.invalidateQueries({ queryKey: ["academy", "course", slug] });
      qc.invalidateQueries({ queryKey: ["academy", "lesson", slug] });
      qc.invalidateQueries({ queryKey: ["academy", "my-courses"] });
    },
  });
}
