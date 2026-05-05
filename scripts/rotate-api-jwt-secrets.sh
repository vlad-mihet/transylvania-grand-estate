#!/usr/bin/env bash
# Generates fresh per-realm JWT secrets, stages them on the Fly app, and
# triggers a deploy. Designed to support the per-realm split landed in the
# C2 fix: admin and academy realms now sign with distinct keys, so rotating
# one realm doesn't invalidate the other.
#
# Side effects:
#   - Writes plaintext secrets to .secrets/jwt-rotation-<ts>.txt (gitignored)
#     so a deploy failure leaves a recoverable trail.
#   - Calls `fly secrets set --stage` then `fly deploy`. Every active session
#     in the corresponding realm is invalidated on cutover — schedule for a
#     low-traffic window.
#
# Usage:
#   bash scripts/rotate-api-jwt-secrets.sh [--app tge-api] [--no-deploy]
#
# Flags:
#   --app <name>    Override the Fly app name (default: tge-api).
#   --no-deploy     Stage secrets but skip `fly deploy`. Useful for staging
#                   ahead of an existing CI deploy.
set -euo pipefail

APP="tge-api"
DEPLOY=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app)
      APP="$2"
      shift 2
      ;;
    --no-deploy)
      DEPLOY=0
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

# Pre-flight: required tools.
for cmd in flyctl openssl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command not found: $cmd" >&2
    exit 1
  fi
done

# Pre-flight: Fly auth + app exists.
if ! flyctl auth whoami >/dev/null 2>&1; then
  echo "Not logged in to Fly. Run: flyctl auth login" >&2
  exit 1
fi
if ! flyctl status --app "$APP" >/dev/null 2>&1; then
  echo "Fly app not found or no access: $APP" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_DIR="$REPO_ROOT/.secrets"
mkdir -p "$SECRETS_DIR"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$SECRETS_DIR/jwt-rotation-$TS.txt"

# 48 raw bytes → 64 base64 chars. Comfortably above the 32-char floor that
# env validation enforces.
gen() { openssl rand -base64 48 | tr -d '\n'; }

ADMIN_ACCESS="$(gen)"
ADMIN_REFRESH="$(gen)"
ACADEMY_ACCESS="$(gen)"
ACADEMY_REFRESH="$(gen)"

# Persist locally first so a Fly hiccup doesn't burn the values.
{
  printf '# JWT rotation %s — Fly app: %s\n' "$TS" "$APP"
  printf '# Save these to your secrets manager. The file is gitignored.\n\n'
  printf 'JWT_ADMIN_ACCESS_SECRET=%s\n' "$ADMIN_ACCESS"
  printf 'JWT_ADMIN_REFRESH_SECRET=%s\n' "$ADMIN_REFRESH"
  printf 'JWT_ACADEMY_ACCESS_SECRET=%s\n' "$ACADEMY_ACCESS"
  printf 'JWT_ACADEMY_REFRESH_SECRET=%s\n' "$ACADEMY_REFRESH"
} > "$OUT"
chmod 600 "$OUT" 2>/dev/null || true
echo "Wrote secrets to $OUT"

echo "Staging secrets on Fly app: $APP"
flyctl secrets set --app "$APP" --stage \
  "JWT_ADMIN_ACCESS_SECRET=$ADMIN_ACCESS" \
  "JWT_ADMIN_REFRESH_SECRET=$ADMIN_REFRESH" \
  "JWT_ACADEMY_ACCESS_SECRET=$ACADEMY_ACCESS" \
  "JWT_ACADEMY_REFRESH_SECRET=$ACADEMY_REFRESH"

if [[ "$DEPLOY" -eq 1 ]]; then
  echo "Deploying $APP — this releases the new image with the new secrets."
  # `flyctl deploy` resolves the Dockerfile relative to the directory holding
  # fly.toml, so cd into the api app first instead of relying on the caller's
  # cwd. (The api fly.toml lives at apps/api/fly.toml in this monorepo.)
  (cd "$REPO_ROOT/apps/api" && flyctl deploy)
else
  echo "Skipped deploy. cd apps/api && flyctl deploy when ready."
fi

echo
echo "Done. Reminder: every active session in both realms is now invalidated."
echo "Once the deploy is healthy, you can drop the legacy Fly secrets:"
echo "  flyctl secrets unset --app $APP JWT_ACCESS_SECRET JWT_REFRESH_SECRET"
