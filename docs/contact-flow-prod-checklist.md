# Contact Flow — Pre-Deploy Checklist

**Audit**: 2026-05-10. **Owner**: ops + on-call engineer.

This is the gate between "merged to main" and "real EU customers can submit
inquiries". The Tier 1–3 code work (PII redaction, env hardening, metrics,
CI) is complete; the items below are owner-actions that must happen
outside the codebase before production traffic is enabled. Tick them off
in order; each section depends on the previous.

---

## 1. Fly secrets

These are required by `productionSchema` in
`apps/api/src/common/config/env.schema.ts`. The API will refuse to boot
without them, so set them BEFORE the first deploy that includes the
contact-flow work.

```sh
# Real Resend API key (from https://resend.com/api-keys → "Production").
# DO NOT use the dev sandbox key — it only delivers to the account holder.
flyctl secrets set --app tge-api RESEND_API_KEY=re_...

# Sender address. Domain must be verified with Resend (see section 2).
flyctl secrets set --app tge-api EMAIL_FROM='TGE <no-reply@transylvaniagrandestate.ro>'

# Comma-separated list of admin/sales recipients for the new-inquiry alert.
# Distribution list or shared inbox is fine; Resend will fan-out.
flyctl secrets set --app tge-api INQUIRIES_NOTIFY_TO='ops@tge.com,leads@reveria.com'

# Recommended (not boot-required): Sentry DSN for error reporting + traces.
flyctl secrets set --app tge-api SENTRY_DSN=https://...@sentry.io/...

# Recommended: Prometheus scrape token. /metrics 404s without it.
flyctl secrets set --app tge-api METRICS_BEARER_TOKEN=$(openssl rand -hex 32)
```

**Verify**: `flyctl secrets list --app tge-api` shows all five entries.
Do NOT copy values into anything that ends up committed.

---

## 2. DNS records (per brand domain)

Resend will reject `EMAIL_FROM` addresses on unverified domains —
`onboarding@resend.dev` only delivers to the Resend account holder, which
is unsuitable for customer confirmations.

For each brand domain (TGE: `transylvaniagrandestate.ro`, Reveria:
`reveria.com`):

1. Open Resend dashboard → Domains → Add domain.
2. Resend will display three DNS records to add:
   - **DKIM** TXT record (for outbound signing)
   - **SPF** TXT record (or merge into your existing SPF if any)
   - **DMARC** TXT record (recommended; start with `p=none` and tighten
     once Resend reports show clean alignment)
3. Add all three to your DNS provider. Propagation is usually <10
   minutes; Resend's "Verify" button polls.
4. Once verified, the domain shows "Verified" in green and is selectable
   as a sender.

**Verify**:

```sh
dig +short TXT _dmarc.transylvaniagrandestate.ro
dig +short TXT resend._domainkey.transylvaniagrandestate.ro
```

Both should return non-empty TXT records matching what Resend gave you.

---

## 3. Legal sign-off

The `/privacy` page on landing, revery, and academy renders v1 GDPR-
compliant generic copy from the `PrivacyPolicy` namespace in each app's
`messages/{en,ro,fr,de}.json`. Counsel should review the text for the
specific brand context before launch.

**Files**:

- `apps/landing/src/app/[locale]/privacy/page.tsx` (renders shared keys)
- `apps/revery/src/app/[locale]/privacy/page.tsx`
- `apps/academy/src/app/[locale]/privacy/page.tsx`
- Translation source: each app's `messages/*.json` → `PrivacyPolicy.*`

**Versioning**: the consent checkbox stamps `gdprConsentVersion` (currently
`"2026-05-10"`) on every inquiry. When counsel updates the policy, bump
the constant in `packages/hooks/src/use-inquiry-submission.ts:PRIVACY_POLICY_VERSION`
and update each app's `PrivacyPolicy.lastUpdated` string. Old consent
records keep their original version so we can prove what each user agreed
to.

**Cookie banner**: not implemented — and not required. Full-sweep 2026-07
cookie inventory (source + on-the-wire) confirmed all three public sites
set only strictly-necessary cookies (`NEXT_LOCALE` + first-party auth);
zero analytics/marketing/third-party trackers. Strictly-necessary cookies
are exempt from ePrivacy prior consent, so the linked cookie policy is
sufficient and a banner is not mandatory (sweep BUG-125, closed Wontfix).
**This changes the moment a non-essential cookie is added** — introducing
any analytics/marketing tool makes a consent banner mandatory again.

---

## 4. Staging smoke tests

Run these on a staging deploy (Fly stack with the prod-readiness PR
merged) before flipping prod. Each is a manual ~5-min check.

### 4a. Submit + notify path

For each combination, submit a real-looking inquiry and verify both
emails arrive:

| App | Locale | Form |
|---|---|---|
| landing | en | `/contact` |
| landing | ro | `/contact` |
| revery | en | `/contact` |
| revery | ro | `/contact` |
| revery | fr | `/contact` (regression check for Critical #16) |
| revery | de | `/contact` (regression check for Critical #16) |
| revery | ro | property-detail page → inline form |
| revery | en | InquiryModal triggered from a property card |
| academy | en | `/support` |

For each:

- Submitter email arrives in the matching language with brand-correct
  signoff (TGE / Reveria / TGE Academy).
- Admin alert arrives at `INQUIRIES_NOTIFY_TO` in English with submitter
  details.
- Inquiry visible in `/admin/inquiries` with correct `siteId`, `app`,
  `source`, `consentedAt`, `gdprConsentVersion`.

### 4b. Honeypot trap

```sh
curl -X POST https://staging.api.tge.com/api/v1/inquiries \
  -H 'Content-Type: application/json' \
  -H 'X-Site: REVERY' \
  -H 'Origin: https://reveria.com' \
  -d '{
    "name": "Bot Probe",
    "email": "bot@example.com",
    "message": "I am a bot filling every field including the hidden one.",
    "gdprConsent": true,
    "website": "http://spam.example/buy-pills"
  }'
```

Expected: 201 with `id: "00000000-0000-0000-0000-000000000000"`. Check
the DB — no row created. Check Prometheus —
`tge_inquiries_honeypot_triggered_total{siteId="REVERY"}` incremented.

### 4c. Rate-limit

```sh
for i in {1..7}; do
  curl -s -o /dev/null -w "%{http_code} " \
    -X POST https://staging.api.tge.com/api/v1/inquiries \
    -H 'Content-Type: application/json' \
    -H 'X-Site: REVERY' \
    -H 'Origin: https://reveria.com' \
    -H "X-Forwarded-For: 203.0.113.99" \
    -d "{\"name\":\"Probe $i\",\"email\":\"p$i@x.y\",\"message\":\"Probe $i with enough chars to satisfy the min\",\"gdprConsent\":true}"
done
```

Expected: `201 201 201 201 201 429 429`. Check Prometheus —
`tge_inquiries_throttled_total` incremented.

### 4d. Origin lock

```sh
curl -X POST https://staging.api.tge.com/api/v1/inquiries \
  -H 'Content-Type: application/json' \
  -H 'X-Site: REVERY' \
  -H 'Origin: https://evil.example' \
  -d '{...valid body...}'
```

Expected: `403 Forbidden`. Check Prometheus —
`tge_inquiries_origin_blocked_total` incremented.

### 4e. Audit-log redaction proof

In `staging-admin`, edit an inquiry's status (`new → read`). Then query
the DB:

```sql
SELECT before, after, diff FROM audit_logs
WHERE resource = 'Inquiry'
ORDER BY id DESC LIMIT 1;
```

Expected: `before.name`, `before.email`, `before.phone`, `before.message`
all show as `[REDACTED]`. The `diff` JSON contains a status entry with
real values (`new` → `read`). No customer email/phone/name string
appears in any column.

---

## 5. Deploy sequence

The Fly release_command in `apps/api/fly.toml:8` runs migrations BEFORE
the new code starts:

```toml
[deploy]
release_command = "npx prisma migrate deploy"
```

So the sequence on `flyctl deploy --app tge-api`:

1. Build new image.
2. Run `prisma migrate deploy` against prod DB. Three migrations apply:
   - `20260510120000_add_inquiry_consent_fields`
   - `20260510130000_extend_inquiry_type`
   - `20260510140000_add_inquiry_site_app_softdelete`
3. If migrate fails: deploy halts, old code keeps running, no app
   downtime. Investigate in `flyctl logs --app tge-api`.
4. If migrate succeeds: new code rolls out.

**Verify post-deploy**: `flyctl ssh console --app tge-api` then
`pnpm exec prisma migrate status` reports "Database schema is up to
date!".

**Rollback plan**: schema additions are forward-compatible (all new
columns are nullable or have defaults). An app rollback to the previous
revision works without a DB rollback. If the migration itself needs to
be undone, manual SQL is required — preserve the data first.

---

## 6. Monitoring

### 6a. Prometheus scrape

Add to your Prometheus config:

```yaml
- job_name: tge-api
  scheme: https
  metrics_path: /api/v1/metrics
  authorization:
    type: Bearer
    credentials: <METRICS_BEARER_TOKEN>
  static_configs:
    - targets: ['api.tge.com']
```

### 6b. Grafana panel queries

```promql
# Inquiry submission rate (success only) by brand
rate(tge_inquiries_submitted_total{result="success"}[5m])

# Honeypot trip rate (should be steady, low — spikes mean a bot attack)
rate(tge_inquiries_honeypot_triggered_total[5m])

# Origin-block rate (should be near zero — spikes mean someone forged Origin)
rate(tge_inquiries_origin_blocked_total[5m])

# Throttler rate
rate(tge_inquiries_throttled_total[5m])

# 95th percentile time-to-read across the last hour (SLA gauge)
histogram_quantile(0.95, rate(tge_inquiry_time_to_read_seconds_bucket[1h]))
```

### 6c. Alerts

```yaml
# 24h response SLA breach. The form copy promises "within 24 hours" so
# a 95th-percentile breach above that is a customer-facing miss.
- alert: InquirySLABreached
  expr: histogram_quantile(0.95, rate(tge_inquiry_time_to_read_seconds_bucket[1h])) > 86400
  for: 30m
  labels: { severity: warning }
  annotations:
    summary: "Inquiry first-read p95 exceeds 24h promise"

# Sustained honeypot fire — likely bot attack.
- alert: InquiryBotAttack
  expr: rate(tge_inquiries_honeypot_triggered_total[5m]) > 1
  for: 10m
  labels: { severity: warning }
  annotations:
    summary: "Honeypot tripping >60/min — coordinated bot run likely"

# Sustained origin-block — someone is forging Origin headers.
- alert: InquiryOriginAttack
  expr: rate(tge_inquiries_origin_blocked_total[5m]) > 0.5
  for: 10m
  labels: { severity: critical }
  annotations:
    summary: "Origin lock blocking >30/min — investigate forged Origin"
```

### 6d. Sentry

If `SENTRY_DSN` is set, the API auto-captures unhandled exceptions plus
explicit `Sentry.captureException()` calls inside the email-dispatch
catch handlers. Each captured exception is tagged with
`{ template, inquiryId }` for fast triage. Honeypot / throttle / origin
events show as breadcrumbs on adjacent issues, not as exceptions of
their own (they're expected steady-state noise — alert on the
Prometheus metrics instead).

---

## 7. Rollback drill

Practice this at least once before launch. With a staging-deployed
inquiry, walk through:

1. **Soft-delete + restore**: from admin, delete an inquiry → confirm it
   disappears from the default list → click the Undo toast → confirm it
   reappears.
2. **App rollback**: `flyctl releases --app tge-api`, pick the previous
   image, `flyctl deploy --image <id>`. New code rolls back; the schema
   stays. Verify the older code still works against the new schema
   (forward-compat is the contract — should be a no-op).
3. **Honeypot disable**: if a real customer ever trips the trap (we will
   monitor reports), the path is to lift the field-name match. The
   honeypot lives in `packages/ui/src/components/inquiry/honeypot-field.tsx`
   and the Zod field is `website` in `packages/types/src/schemas/inquiry.ts`.

---

## Sign-off

- [ ] Section 1 — Fly secrets set + verified
- [ ] Section 2 — DNS records added + Resend domain verified for both
      brands
- [ ] Section 3 — Counsel review on `/privacy` text + sign-off recorded
- [ ] Section 4a — Submit + notify smoke for all 9 surface×locale rows
- [ ] Section 4b — Honeypot smoke
- [ ] Section 4c — Rate-limit smoke
- [ ] Section 4d — Origin-lock smoke
- [ ] Section 4e — Audit redaction proof
- [ ] Section 5 — Deploy sequence executed; migrate status reports clean
- [ ] Section 6 — Prometheus scrape live, Grafana panels populated,
      alerts wired
- [ ] Section 7 — Rollback drill walked at least once

When every box is ticked, the contact flow is production-ready. Add the
date + your name in this footer and merge:

> Production sign-off: ___________________ on YYYY-MM-DD.
