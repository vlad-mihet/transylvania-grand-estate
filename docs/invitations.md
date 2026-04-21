# Invitations & SSO — Operator Runbook

End-to-end guide for onboarding agents, diagnosing email issues, and responding to incidents on the invitation + Google OAuth system. Anyone admin-level should be able to complete the tasks below without reading source.

---

## 1. Architecture at a glance

```
┌──────────────────┐   POST /invitations/agents   ┌────────────────────┐
│  Admin UI        │ ────────────────────────────▶│  API               │
│  (Agents page)   │  { profile + email }         │  InvitationsService │
│                  │                              │  • tx: Agent +     │
│                  │                              │    Invitation      │
│                  │                              │  • Resend email    │
└──────────────────┘                              └────────────────────┘
                                                          │
                                                          │  email link
                                                          ▼
┌──────────────────┐  set password   admin.tge.ro/accept-invite?token=…
│  Accept page     │ ─────────────▶ /api/invitations/accept/password
│  (public)        │
│                  │  Continue with Google
│                  │ ─────────────▶ /api/v1/auth/google?invitation=…
└──────────────────┘                                     │
                                                         ▼
                                              /auth/google/callback
                                              • verify invitation
                                              • require email match
                                              • emailVerified === true
                                              • create AdminUser +
                                                OAuthIdentity
                                              • issue JWT pair
                                              • redirect to /auth/complete
                                                with refresh-token fragment
```

Data model: `AdminUser` (login), `Agent` (public profile, 1:1 link to login),
`Invitation` (time-limited token, unique per Agent), `OAuthIdentity` (Google
sub → AdminUser), `PasswordResetToken` (1h TTL, one-shot).

---

## 2. Admin playbook

### Invite a new agent

1. Log into admin as SUPER_ADMIN or ADMIN.
2. Go to **Agents** → `+ Invite Agent`.
3. Fill First/Last name, email, phone, slug, bio. Submit.
4. The agent receives an email with a link valid for 7 days. The Agents list now shows the row with **Pending invite**.
5. When the agent accepts, the status flips to **Active**.

### Invite a pre-existing agent (legacy public-only profile)

1. Agents page → find the agent (should show **No login**).
2. Click the Send icon on the row → confirm dialog.
3. Same email-and-wait pattern as above.

### See pending invitations

1. Sidebar → **Settings** → **Invitations**.
2. Filter by status (Pending / Accepted / Expired / Revoked / Bounced).

### Resend an invitation

1. Invitations page → row action **Resend**.
2. This regenerates the token; the previous link stops working immediately.

### Revoke an invitation

1. Invitations page → row action **Revoke**.
2. The link stops working immediately. You can send a fresh invitation afterwards.

### Self-serve password reset (for agents who forgot)

1. Agent clicks **Forgot your password?** on the login page.
2. Enters their email, gets an email with a 1-hour reset link.
3. Sets a new password; they're signed in immediately.

> Admin action: none. Works self-serve. If the agent says they never received the reset email, check the Resend dashboard (see Troubleshooting § 4).

---

## 3. Onboarding a new admin (SUPER_ADMIN / ADMIN / EDITOR)

Phase 1 is AGENT-only. To onboard a non-AGENT admin today:

1. Use the legacy `POST /auth/register` via the Users page (SUPER_ADMIN only). Set a temporary password; share out-of-band.
2. Ask the new admin to change their password immediately via the Change Password dialog (profile menu).

The invitation flow will be extended to ADMIN/EDITOR in a follow-up; the current data model (`Invitation.role`) already supports it.

---

## 4. Troubleshooting

### "Invitation email didn't arrive"

Run through in order:

1. **Spam folder** — most common cause. Ask the recipient to check.
2. **Resend dashboard** — log into Resend, search by recipient email. See if the send was attempted and what status (delivered / bounced / complained / opened).
3. **Account setup** — verify:
   - `RESEND_API_KEY` is set in Fly secrets (`fly secrets list -a tge-api`).
   - `EMAIL_FROM` uses a domain that Resend has verified DKIM + SPF for.
   - DNS records at the registrar match what Resend's domain verification page shows.
4. **Invitation record** — in Prisma Studio, find the Invitation row. Check `emailSentAt` (was a send attempted?), `emailAttempts`, `bouncedAt`, `bounceReason`.
5. **Webhook** — if `bouncedAt` is set, the email hard-bounced. The `invitations.status` is `BOUNCED`. Options: contact the agent via a different channel and ask for a correct email, then use **Send invite** on their Agents row to issue a fresh one.

### "Google sign-in shows an error banner on login"

The banner decodes a code from `?error=` in the URL:

| Code | Meaning | Fix |
|------|---------|-----|
| `no_account` | Google sign-in succeeded but no AdminUser is linked to that Google identity | Ask SUPER_ADMIN to send an invitation to the user's Google email. |
| `email_mismatch` | The Google account email doesn't match the invitation email | User must pick the right Google account; or admin re-invites with the correct email. |
| `email_unverified` | Google returned `verified: false` | User verifies their email on Google, retries. |
| `google_not_configured` | `GOOGLE_CLIENT_ID` / `SECRET` / `CALLBACK_URL` missing on the API | Set the three vars in Fly secrets on `tge-api`. |
| `state_invalid` | OAuth `state` JWT was tampered or expired (>10 min) | User restarts the flow from `/accept-invite`. |
| `oauth_failed` | Generic — Google consent cancelled or network error | User retries. |

Also check `NEXT_PUBLIC_SSO_GOOGLE_ENABLED=true` on the admin deploy; without it the Google button stays disabled.

### "User says the link is expired"

Default TTL is 7 days; reminder email fires at -24h. If either window passed, Invitations page → **Resend**.

### "User locked out — no password, no Google"

This is the one workflow that can't self-serve today (until the password-reset flow matures for SSO-side flips). Options:

1. **Preferred:** Revoke the ACCEPTED invitation if still visible, delete the AdminUser (Users page → row action), and re-invite from Agents.
2. **Emergency:** Have the user use **Forgot your password?** if they had a password at some point. If they never set one, use option 1.

---

## 5. One-time setup

### Google OAuth (GCP console)

1. https://console.cloud.google.com/apis/credentials → create project `tge-admin`.
2. "OAuth consent screen": External → fill in app name, logo, support email, scopes: `email`, `profile`, `openid`. Add authorized domains: `tge.ro`. Save.
3. Credentials → Create Credentials → OAuth 2.0 Client ID → Web application.
4. **Authorized JavaScript origins:** `https://admin.tge.ro` (and `http://localhost:3001` for dev).
5. **Authorized redirect URIs:** `https://tge-api.fly.dev/api/v1/auth/google/callback` (and `http://localhost:4000/api/v1/auth/google/callback`).
6. Copy client ID + client secret.
7. `fly secrets set -a tge-api GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=… GOOGLE_CALLBACK_URL=https://tge-api.fly.dev/api/v1/auth/google/callback`.
8. On the admin deploy: `fly secrets set -a tge-admin NEXT_PUBLIC_SSO_GOOGLE_ENABLED=true` and redeploy (it's a build-time flag — `fly deploy` rebuilds the Next.js bundle).
9. Before public launch: submit the OAuth consent screen for Google verification (removes "unverified app" warning for end-users).

### Resend

1. Create Resend account → API Keys → create a key with the **Sending** scope only.
2. Domains → Add Domain `tge.ro` → follow the DKIM + SPF + MX instructions to add DNS records at your registrar.
3. Wait for Resend to show ✓ on all three records (usually <10min).
4. `fly secrets set -a tge-api RESEND_API_KEY=re_… EMAIL_FROM="TGE <no-reply@tge.ro>"`.
5. Webhooks: Resend → Webhooks → add endpoint `https://tge-api.fly.dev/api/v1/webhooks/resend`. Select events `email.delivered`, `email.bounced`, `email.complained`. Copy the Signing Secret.
6. `fly secrets set -a tge-api RESEND_WEBHOOK_SECRET=whsec_…`.

Without the webhook secret the endpoint rejects every call with 503 (fail closed). Without the API key the service logs would-be emails to stdout instead of sending (fail useful-for-dev).

### Observability

1. `fly secrets set -a tge-api METRICS_BEARER_TOKEN=$(openssl rand -base64 32)`. Without this the `/api/v1/metrics` endpoint returns 404.
2. Configure your Prometheus / Grafana Cloud / Axiom scraper to hit `https://tge-api.fly.dev/api/v1/metrics` with `Authorization: Bearer $METRICS_BEARER_TOKEN`.
3. Useful queries once metrics land:
   - Invitation accept rate: `rate(tge_invitations_accepted_total[1d]) / rate(tge_invitations_created_total[1d])`.
   - Email failure ratio: `rate(tge_emails_sent_total{result="failure"}[1h]) / rate(tge_emails_sent_total[1h])`.
   - OAuth rejections by reason: `sum by (reason) (rate(tge_oauth_rejections_total[1d]))`.

### Structured logs

All invitation + auth events use structured payloads: `event`, `invitationId`, `actorId`, `toDomain`, etc. In Axiom/Loki/CloudWatch, filter `event:"invitation.*"` or `event:"oauth.rejected"`. Emails never appear in full — only the domain.

---

## 6. Emergency procedures

| Incident | Response |
|----------|----------|
| Compromised invitation token (link leaked) | Invitations page → **Revoke**. Issue a fresh invitation if needed. |
| Compromised AdminUser session (JWT leaked) | Rotate both `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in Fly secrets + redeploy. All users re-login. (Granular revocation is a Phase-3 item.) |
| Compromised Google OAuth client secret | GCP console → credentials → delete + recreate client; update `GOOGLE_CLIENT_SECRET` in Fly secrets; redeploy. In-flight sign-ins fail; users restart. |
| Compromised `INVITATION_TOKEN_SECRET` | Rotate; all in-flight OAuth state JWTs invalidate. Users mid-flow see `state_invalid` error and restart. |
| Compromised `RESEND_WEBHOOK_SECRET` | Regenerate in Resend dashboard; update in Fly secrets. In-flight bounce events may be missed during the rotation window; admin may need to manually mark BOUNCED via Prisma Studio for affected rows. |
| Compromised `METRICS_BEARER_TOKEN` | Regenerate and update scrapers. Low severity — metrics are aggregate only. |
| Mass invitation revocation (bad batch sent) | Prisma Studio or psql: `UPDATE invitations SET status='REVOKED' WHERE invited_by_id='<actor>' AND created_at > '<cutoff>' AND status='PENDING';` |
| Resend outage | Non-blocking: invitations still save with `emailSentAt IS NULL`. The 10-minute retry cron attempts the send up to 5 times (1m, 5m, 15m, 1h, 4h backoffs). After that, admin resends manually from the Invitations page. |
| Google OAuth outage | Password path still works. Affected users can accept via **Set a password** on the accept-invite page. |

---

## 7. Known limitations

- **JWT lifetime on revoke:** Deleted or revoked AdminUsers can use existing access tokens for up to 15 minutes. Refresh tokens are reusable for 7 days until cleared. A JWT denylist (P3.1 in the Phase-2 plan) would close this; not blocking today.
- **Single-instance cron safety:** Expiry / reminder / retry crons assume a single Fly machine. Scaling `min_machines_running` past 1 would cause duplicate runs — not data-corrupting (updates are idempotent) but wasteful. Add `pg_advisory_lock` before scaling out.
- **Non-AGENT invite flow:** Invitation data model supports any `AdminRole`, but the UI only surfaces the AGENT flow today. Non-AGENT onboarding uses legacy `/auth/register`.
- **Resend SDK latency:** We've observed p95 send latency of ~400ms in prod. `tge_email_send_duration_seconds` histogram tracks it; alert if p95 goes over 2s.
- **DE / FR email templates:** Rendered from EN base with translated strings. No per-locale design review yet.

---

## 8. Where the code lives

| Concern | Path |
|---------|------|
| Prisma models | `apps/api/prisma/schema.prisma` |
| Invitation service + cron | `apps/api/src/invitations/invitations.service.ts` |
| Password reset service + cron | `apps/api/src/password-reset/password-reset.service.ts` |
| Email templates | `apps/api/src/email/templates/*.template.ts` |
| Resend webhook | `apps/api/src/webhooks/resend.controller.ts` |
| Google OAuth controller | `apps/api/src/auth/auth.controller.ts` (`googleAuth`, `googleCallback`) |
| Metrics registry | `apps/api/src/metrics/metrics.service.ts` |
| Accept page (public) | `apps/admin/src/app/[locale]/accept-invite/page.tsx` |
| Forgot / reset pages | `apps/admin/src/app/[locale]/{forgot,reset}-password/page.tsx` |
| Invitations admin page | `apps/admin/src/app/[locale]/(dashboard)/invitations/page.tsx` |
| Agents list (status column) | `apps/admin/src/app/[locale]/(dashboard)/agents/page.tsx` |
| Login form + OAuth error banner | `apps/admin/src/components/auth/login-form.tsx` |
| OAuth handoff page | `apps/admin/src/app/[locale]/auth/complete/page.tsx` |
| E2E tests | `apps/api/test/*.e2e-spec.ts` (see also `jest-e2e.config.ts`) |
