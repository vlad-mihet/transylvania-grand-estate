"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiFetch,
  clearTokens,
  getRefreshToken,
  setTokens,
} from "@/lib/api-client";
import { qk } from "./query-keys";
import type { Profile } from "./queries";

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user?: { id: string; email: string; name: string };
};

/* ───── Auth ───── */

export function useLogin() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiFetch<AuthTokens>("/academy/auth/login", {
        method: "POST",
        body,
        skipAuth: true,
      }),
    onSuccess: (data) =>
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      }),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: {
      name: string;
      email: string;
      password: string;
      locale: "ro" | "en" | "fr" | "de";
    }) =>
      apiFetch<{ ok: true }>("/academy/auth/register", {
        method: "POST",
        body,
        skipAuth: true,
      }),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (body: { token: string }) =>
      apiFetch<AuthTokens>("/academy/auth/verify-email", {
        method: "POST",
        body,
        skipAuth: true,
      }),
    onSuccess: (data) =>
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      }),
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
  return useMutation({
    mutationFn: (body: { token: string; password: string }) =>
      apiFetch<AuthTokens>("/academy/auth/invitations/accept-password", {
        method: "POST",
        body,
        skipAuth: true,
      }),
    onSuccess: (data) =>
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await apiFetch<{ ok: boolean }>("/academy/auth/logout", {
          method: "POST",
          body: { refreshToken },
          skipAuth: true,
        }).catch(() => undefined);
      }
      clearTokens();
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
