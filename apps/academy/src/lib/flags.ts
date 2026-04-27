/**
 * Build-time feature flags. Mirror the API-side EMAIL_VERIFICATION_DISABLED
 * and GOOGLE_AUTH_DISABLED env vars so the UI can hide elements (Google
 * buttons, "verify your email" banner) that would dead-end against a
 * disabled API endpoint. All flag reads in this app go through this module
 * so the `=== "true"` parse and naming live in exactly one place.
 *
 * Note: NEXT_PUBLIC_* vars are baked into the bundle at build time. Toggling
 * a flag requires a rebuild (or restarting `next dev`).
 */
export const flags = {
  emailVerificationDisabled:
    process.env.NEXT_PUBLIC_EMAIL_VERIFICATION_DISABLED === "true",
  googleAuthDisabled:
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_DISABLED === "true",
} as const;
