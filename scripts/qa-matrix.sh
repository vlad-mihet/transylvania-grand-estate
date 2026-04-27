#!/usr/bin/env bash
# Live API role + tier matrix for the QA Phase-1 sweep.
# Idempotent against a freshly-seeded DB; assumes prisma/qa-reset.ts has been run.

set -uo pipefail
API="${API:-http://localhost:4000/api/v1}"
PASS="QaPass123!"

login() {
  local email="$1"
  curl -s -X POST -H "Content-Type: application/json" -H "X-Site: ADMIN" \
    -d "{\"email\":\"$email\",\"password\":\"$PASS\"}" \
    "$API/auth/login" | jq -r '.data.accessToken'
}

# Same as login() but returns the full {accessToken, refreshToken} pair so
# downstream phases can exercise both without spending another /auth/login
# slot against the 5-per-60s throttler.
login_pair() {
  local email="$1"
  curl -s -X POST -H "Content-Type: application/json" -H "X-Site: ADMIN" \
    -d "{\"email\":\"$email\",\"password\":\"$PASS\"}" \
    "$API/auth/login"
}

ST() {
  # Hit endpoint; print method + path + role + X-Site + status
  local role="$1" token="$2" site="$3" method="$4" path="$5" body="${6:-}"
  local args=(-s -o /dev/null -w "%{http_code}" -X "$method"
    -H "Authorization: Bearer $token"
    -H "X-Site: $site")
  if [[ -n "$body" ]]; then args+=(-H "Content-Type: application/json" -d "$body"); fi
  local code
  code=$(curl "${args[@]}" "$API$path")
  printf "  %-13s site=%-12s %-6s %-50s -> %s\n" "$role" "$site" "$method" "$path" "$code"
}

echo "=== Phase 1: minting tokens ==="
# Mint super_admin via the pair-fetcher so Phase 14 can reuse the RT.
SUPER_PAIR=$(login_pair admin@tge.ro)
T_SUPER=$(echo "$SUPER_PAIR" | jq -r '.data.accessToken')
T_SUPER_RT=$(echo "$SUPER_PAIR" | jq -r '.data.refreshToken')
T_ADMIN=$(login manager@tge.ro)
T_EDIT=$(login editor@tge.ro)
T_AGENT=$(login agent@tge.ro)
echo "  super: ${T_SUPER:0:24}..."
echo "  admin: ${T_ADMIN:0:24}..."
echo "  editor: ${T_EDIT:0:24}..."
echo "  agent: ${T_AGENT:0:24}..."

echo ""
echo "=== Phase 2: pick representative resources ==="
# Pick a luxury and an affordable property to test tier isolation, plus
# the AGENT's own property and a foreign one.
LUX_ID=$(curl -s -H "X-Site: TGE_LUXURY" "$API/properties?limit=1" | jq -r '.data[0].id')
AFF_ID=$(curl -s -H "X-Site: REVERIA"    "$API/properties?limit=1" | jq -r '.data[0].id')
AGENT_ROW_ID=$(curl -s -H "Authorization: Bearer $T_AGENT" -H "X-Site: ADMIN" \
  "$API/properties?limit=1" | jq -r '.data[0].id')
# A property owned by a *different* agent (just ask SUPER_ADMIN for a property
# whose agent is not the QA agent's id).
QA_AGENT_ID=$(curl -s -H "Authorization: Bearer $T_AGENT" "$API/agents/me" -H "X-Site: ADMIN" | jq -r '.data.id')
FOREIGN_ID=$(curl -s -H "Authorization: Bearer $T_SUPER" -H "X-Site: ADMIN" \
  "$API/properties?limit=100" | jq -r ".data | map(select(.agentId != \"$QA_AGENT_ID\")) | .[0].id")
COURSE_ID=$(curl -s -H "Authorization: Bearer $T_SUPER" -H "X-Site: ADMIN" \
  "$API/admin/academy/courses?limit=1" | jq -r '.data[0].id // empty')
echo "  luxury property:    $LUX_ID"
echo "  affordable property: $AFF_ID"
echo "  agent's own:        $AGENT_ROW_ID"
echo "  foreign property:   $FOREIGN_ID"
echo "  course (if any):    ${COURSE_ID:-<none seeded>}"

echo ""
echo "=== Phase 3: tier matrix on GET /properties ==="
echo "  (ADMIN tier scope = null = see all; LUXURY = luxury only; REVERIA = affordable only)"
echo "  Reading meta.total to capture full count regardless of pagination cap."
for site in ADMIN TGE_LUXURY REVERIA ACADEMY; do
  total=$(curl -s -H "Authorization: Bearer $T_SUPER" -H "X-Site: $site" \
    "$API/properties?limit=1" | jq -r '.meta.total // (.data | length)')
  printf "  %-12s -> %s total\n" "$site" "$total"
done

echo ""
echo "=== Phase 4: GET /properties auto-scoping per role ==="
for role_token in "SUPER_ADMIN:$T_SUPER" "ADMIN:$T_ADMIN" "EDITOR:$T_EDIT" "AGENT:$T_AGENT"; do
  role="${role_token%%:*}"
  tok="${role_token#*:}"
  total=$(curl -s -H "Authorization: Bearer $tok" -H "X-Site: ADMIN" \
    "$API/properties?limit=1" | jq -r '.meta.total // (.data | length)')
  printf "  %-12s sees %s total properties\n" "$role" "$total"
done

echo ""
echo "=== Phase 5: write enforcement matrix ==="
SAMPLE_BODY='{"name":"qa-test","slug":"qa-test-temp","description":"qa","city":"Brasov","citySlug":"brasov"}'
PATCH_BODY='{"featured":false}'
for role_token in "SUPER_ADMIN:$T_SUPER" "ADMIN:$T_ADMIN" "EDITOR:$T_EDIT" "AGENT:$T_AGENT"; do
  role="${role_token%%:*}"
  tok="${role_token#*:}"
  echo "  --- $role ---"
  ST "$role" "$tok" ADMIN POST   "/developers" "$SAMPLE_BODY"
  ST "$role" "$tok" ADMIN PATCH  "/developers/00000000-0000-0000-0000-000000000000" "$PATCH_BODY"
  ST "$role" "$tok" ADMIN DELETE "/developers/00000000-0000-0000-0000-000000000000"
  ST "$role" "$tok" ADMIN POST   "/agents" "$SAMPLE_BODY"
  ST "$role" "$tok" ADMIN GET    "/auth/users"
  ST "$role" "$tok" ADMIN GET    "/audit-log?limit=1"
done

echo ""
echo "=== Phase 6: AGENT ownership ==="
echo "  AGENT viewing own property"
ST AGENT "$T_AGENT" ADMIN GET   "/properties/id/$AGENT_ROW_ID"
echo "  AGENT viewing foreign property (public detail endpoint)"
ST AGENT "$T_AGENT" ADMIN GET   "/properties/id/$FOREIGN_ID"
echo "  AGENT PATCH own (expect 200)"
ST AGENT "$T_AGENT" ADMIN PATCH "/properties/$AGENT_ROW_ID" '{"featured":false}'
echo "  AGENT PATCH foreign (expect 403)"
ST AGENT "$T_AGENT" ADMIN PATCH "/properties/$FOREIGN_ID" '{"featured":false}'
echo "  AGENT DELETE own (expect 403 — only ADMIN+ can delete)"
ST AGENT "$T_AGENT" ADMIN DELETE "/properties/$AGENT_ROW_ID"

echo ""
echo "=== Phase 7: course delete (ADMIN+ only) ==="
if [[ -n "$COURSE_ID" ]]; then
  echo "  EDITOR DELETE course (expect 403)"
  ST EDITOR "$T_EDIT" ADMIN DELETE "/admin/academy/courses/$COURSE_ID"
fi

echo ""
echo "=== Phase 8: invitation flow throttling ==="
# Verify endpoint accepts a token query and returns a 4xx (not 5xx) on bad input
curl -s -o /dev/null -w "verify(no-token)         -> %{http_code}\n" "$API/invitations/verify"
curl -s -o /dev/null -w "verify(bad-token)        -> %{http_code}\n" "$API/invitations/verify?token=invalidtoken"

echo ""
echo "=== Phase 9: academy course/lesson positive+negative writes ==="
# EDITOR can create courses + lessons, ADMIN+ can delete. Confirm.
echo "  EDITOR POST /admin/academy/courses (validation 400 OK; we just want NOT 403)"
ST EDITOR "$T_EDIT" ADMIN POST "/admin/academy/courses" '{}'
echo "  AGENT  POST /admin/academy/courses (expect 403)"
ST AGENT "$T_AGENT" ADMIN POST "/admin/academy/courses" '{}'
if [[ -n "$COURSE_ID" ]]; then
  echo "  EDITOR POST /admin/academy/courses/$COURSE_ID/lessons (validation OK; not 403)"
  ST EDITOR "$T_EDIT" ADMIN POST "/admin/academy/courses/$COURSE_ID/lessons" '{}'
  # Pick a lesson if any exist
  LESSON_ID=$(curl -s -H "Authorization: Bearer $T_SUPER" -H "X-Site: ADMIN" \
    "$API/admin/academy/courses/$COURSE_ID/lessons?limit=1" | jq -r '.data[0].id // empty')
  if [[ -n "$LESSON_ID" ]]; then
    echo "  EDITOR DELETE lesson (expect 403, only ADMIN+)"
    ST EDITOR "$T_EDIT" ADMIN DELETE "/admin/academy/courses/$COURSE_ID/lessons/$LESSON_ID"
    echo "  ADMIN  DELETE lesson would succeed; skipping to preserve fixture"
  fi
fi

echo ""
echo "=== Phase 10: financial-indicator update matrix ==="
PATCH_BODY='{"value":1.234,"source":"qa-test"}'
echo "  SUPER_ADMIN PATCH /financial-data/indicators/IRCC (expect 200/400)"
ST SUPER_ADMIN "$T_SUPER" ADMIN PATCH "/financial-data/indicators/IRCC" "$PATCH_BODY"
echo "  ADMIN  PATCH (expect 200/400)"
ST ADMIN "$T_ADMIN" ADMIN PATCH "/financial-data/indicators/IRCC" "$PATCH_BODY"
echo "  EDITOR PATCH (expect 403)"
ST EDITOR "$T_EDIT" ADMIN PATCH "/financial-data/indicators/IRCC" "$PATCH_BODY"
echo "  AGENT  PATCH (expect 403)"
ST AGENT "$T_AGENT" ADMIN PATCH "/financial-data/indicators/IRCC" "$PATCH_BODY"

echo ""
echo "=== Phase 11: site-config update matrix ==="
SITE_BODY='{"name":"qa-test"}'
echo "  SUPER_ADMIN PATCH /site-config"
ST SUPER_ADMIN "$T_SUPER" ADMIN PATCH "/site-config" "$SITE_BODY"
echo "  ADMIN  PATCH"
ST ADMIN "$T_ADMIN" ADMIN PATCH "/site-config" "$SITE_BODY"
echo "  EDITOR PATCH (expect 403)"
ST EDITOR "$T_EDIT" ADMIN PATCH "/site-config" "$SITE_BODY"
echo "  AGENT  PATCH (expect 403)"
ST AGENT "$T_AGENT" ADMIN PATCH "/site-config" "$SITE_BODY"

echo ""
echo "=== Phase 12: testimonial write enforcement ==="
TESTI_BODY='{"clientName":"qa","quote":{"en":"qa","ro":"qa"},"rating":5}'
echo "  EDITOR POST /testimonials (expect 403 — testimonial.create is ADMIN+)"
ST EDITOR "$T_EDIT" ADMIN POST "/testimonials" "$TESTI_BODY"
echo "  AGENT  POST /testimonials (expect 403)"
ST AGENT "$T_AGENT" ADMIN POST "/testimonials" "$TESTI_BODY"

echo ""
echo "=== Phase 13: audit-logs scope per role ==="
for role_token in "SUPER_ADMIN:$T_SUPER" "ADMIN:$T_ADMIN" "EDITOR:$T_EDIT" "AGENT:$T_AGENT"; do
  role="${role_token%%:*}"
  tok="${role_token#*:}"
  total=$(curl -s -H "Authorization: Bearer $tok" -H "X-Site: ADMIN" \
    "$API/audit-logs?limit=1" | jq -r '.meta.total // 0')
  printf "  %-12s sees %s audit events\n" "$role" "$total"
done

echo ""
echo "=== Phase 14: logout invalidates the refresh token ==="
# Reuses the SUPER admin's RT captured at Phase 1 — keeps total /auth/login
# calls per matrix run at 4 (under the 5-per-60s throttle). Logout the RT,
# then replay it against /auth/refresh: expect 401 from the denylist.
if [[ -z "$T_SUPER_RT" || "$T_SUPER_RT" == "null" ]]; then
  echo "  WARN: no refreshToken captured at Phase 1 — skipping phase 14"
else
  LOGOUT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
    -H "X-Site: ADMIN" -d "{\"refreshToken\":\"$T_SUPER_RT\"}" "$API/auth/logout")
  printf "  POST /auth/logout (expect 201)               -> %s\n" "$LOGOUT_CODE"
  REPLAY_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
    -H "X-Site: ADMIN" -d "{\"refreshToken\":\"$T_SUPER_RT\"}" "$API/auth/refresh")
  printf "  POST /auth/refresh w/ revoked RT (expect 401)-> %s\n" "$REPLAY_CODE"
fi

echo ""
echo "=== Phase 15: file upload guards (MIME + magic-byte) ==="
# Two-layer guard from validate-upload.interceptor.ts:
#   - MIME regex blocks non-image content-types up front.
#   - Magic-byte sniff catches mis-labeled files.
# We lean on `curl --form` to reach the multer handler. Property images are
# the canonical surface. Real bytes assert magic-byte; a text file with image
# MIME asserts the second-layer check. SVG is rejected by name.
#
# Path normalization: native curl on Windows (git-bash, MSYS) doesn't read
# unix-style /tmp paths from -F. `to_path` converts via cygpath when present
# (no-op on Linux/macOS) so the same script works on both.
TMP=$(mktemp -d)
to_path() { command -v cygpath >/dev/null 2>&1 && cygpath -w "$1" || echo "$1"; }
PROP_ID=$(curl -s -H "Authorization: Bearer $T_SUPER" -H "X-Site: ADMIN" \
  "$API/properties?limit=1" | jq -r '.data[0].id // empty')
if [[ -z "$PROP_ID" ]]; then
  echo "  WARN: no property to attach images to — skipping phase 15"
else
  # (a) plain text masquerading as image/jpeg → reject (magic byte fails)
  printf 'not-a-jpeg-just-some-text-pretending-to-be' > "$TMP/fake.jpg"
  CODE_TEXT=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $T_SUPER" -H "X-Site: ADMIN" \
    -F "images=@$(to_path "$TMP/fake.jpg");type=image/jpeg" \
    "$API/properties/$PROP_ID/images")
  printf "  POST /properties/:id/images text-as-jpeg (expect 400)-> %s\n" "$CODE_TEXT"

  # (b) SVG payload — explicit deny per validate-upload.interceptor.ts:66-85
  printf '<svg xmlns="http://www.w3.org/2000/svg"></svg>' > "$TMP/file.svg"
  CODE_SVG=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $T_SUPER" -H "X-Site: ADMIN" \
    -F "images=@$(to_path "$TMP/file.svg");type=image/svg+xml" \
    "$API/properties/$PROP_ID/images")
  printf "  POST /properties/:id/images svg            (expect 400)-> %s\n" "$CODE_SVG"

  # (c) real JPEG bytes → success.  SOI marker FFD8FF + minimal trailer FFD9.
  printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9' > "$TMP/real.jpg"
  CODE_REAL=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $T_SUPER" -H "X-Site: ADMIN" \
    -F "images=@$(to_path "$TMP/real.jpg");type=image/jpeg" \
    "$API/properties/$PROP_ID/images")
  printf "  POST /properties/:id/images real jpeg      (expect 201)-> %s\n" "$CODE_REAL"
fi
rm -rf "$TMP"

echo ""
echo "Done."
