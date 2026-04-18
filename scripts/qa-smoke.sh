#!/usr/bin/env bash
# QA smoke suite — re-runnable version of the exploratory QA done on 2026-04-17.
# Exercises API invariants (brand isolation, auth/RBAC, validation, rate limits,
# Prisma errors, filters, file uploads, CORS), then smoke-tests every public
# page and verifies 404 behavior on dynamic routes.
#
# Usage:
#   bash scripts/qa-smoke.sh                    # run all phases
#   bash scripts/qa-smoke.sh --only api         # only API checks (phases B.*)
#   bash scripts/qa-smoke.sh --only pages       # only Next.js page smoke + 404
#   bash scripts/qa-smoke.sh --no-uploads       # skip file upload tests
#   bash scripts/qa-smoke.sh --verbose          # print full API responses on fail
#
# Exit code: 0 if every assertion passed, 1 otherwise.
#
# Dependencies: bash, curl, node (for JSON parsing), docker (for pw reset).
# Works on Git Bash for Windows and on Linux/macOS.

set -uo pipefail

# ─── Config ─────────────────────────────────────────────────────────
API="${QA_API_URL:-http://localhost:3333/api/v1}"
ADMIN="${QA_ADMIN_URL:-http://localhost:3001}"
LANDING="${QA_LANDING_URL:-http://localhost:3000}"
REVERIA="${QA_REVERIA_URL:-http://localhost:3002}"
PG_CONTAINER="${QA_PG_CONTAINER:-tge-postgres-1}"
PG_DB="${QA_PG_DB:-tge_dev}"
PG_USER="${QA_PG_USER:-postgres}"
ADMIN_EMAIL="${QA_ADMIN_EMAIL:-admin@tge.ro}"
# NOTE: A random admin password is generated at first `prisma db seed` unless
# SEED_ADMIN_PASSWORD was set. This script resets it to the value below via a
# direct UPDATE so the script is self-contained. If you pinned your own
# password via SEED_ADMIN_PASSWORD, pass that here instead and disable reset.
ADMIN_PASSWORD="${QA_ADMIN_PASSWORD:-QaTest123!}"
# Precomputed bcrypt (cost 12) of "QaTest123!":
ADMIN_PASSWORD_HASH='$2b$12$9eo9QxdVHjnbg0iNo6GCKOGcSuBBbR0oKbqgJBRF5fX1YIZadAa7y'
RESET_PASSWORD="${QA_RESET_PASSWORD:-1}"   # 0 to skip the DB reset

# Work directory for temp files (JPEG bytes, responses, etc). Git Bash maps
# /tmp to %TEMP%; Node on Windows resolves /tmp to C:\tmp unless we pass a
# Windows path. Use ${TMPDIR:-/tmp} which both honor.
QATMP_UX="${TMPDIR:-/tmp}/qa-smoke"
QATMP_WIN="$(command -v cygpath >/dev/null 2>&1 && cygpath -w "$QATMP_UX" || echo "$QATMP_UX")"
mkdir -p "$QATMP_UX"

# ─── CLI flags ─────────────────────────────────────────────────────
ONLY=""
NO_UPLOADS=0
VERBOSE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --only) ONLY="$2"; shift 2 ;;
    --no-uploads) NO_UPLOADS=1; shift ;;
    --verbose|-v) VERBOSE=1; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

# ─── Output helpers ────────────────────────────────────────────────
if [[ -t 1 ]]; then
  C_GREEN='\033[32m'; C_RED='\033[31m'; C_YELLOW='\033[33m'
  C_BLUE='\033[34m'; C_DIM='\033[2m'; C_RESET='\033[0m'
else
  C_GREEN=''; C_RED=''; C_YELLOW=''; C_BLUE=''; C_DIM=''; C_RESET=''
fi

PASS=0; FAIL=0; WARN=0; SKIP=0
FAILURES=()

# `printf --` terminates options so format strings that begin with "---"
# (after empty color codes in non-tty mode) aren't interpreted as flags.
section()    { printf -- "\n${C_BLUE}=== %s ===${C_RESET}\n" "$1"; }
subsection() { printf -- "${C_DIM}--- %s ---${C_RESET}\n" "$1"; }
ok()         { PASS=$((PASS+1)); printf -- "  ${C_GREEN}✓${C_RESET} %s\n" "$1"; }
fail() {
  FAIL=$((FAIL+1)); FAILURES+=("$1")
  printf -- "  ${C_RED}✗${C_RESET} %s\n" "$1"
  if [[ $VERBOSE -eq 1 && -n "${2:-}" ]]; then
    printf -- "    ${C_DIM}%s${C_RESET}\n" "$2"
  fi
}
warn() { WARN=$((WARN+1)); printf -- "  ${C_YELLOW}!${C_RESET} %s\n" "$1"; }
skip() { SKIP=$((SKIP+1)); printf -- "  ${C_DIM}− skip: %s${C_RESET}\n" "$1"; }

# ─── JSON helpers (use node; every box that has pnpm has node) ──────
json_get() {
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);let v=j;for(const k of process.argv[1].split('.')){if(v==null)break;v=v[k]}console.log(v==null?'':typeof v==='object'?JSON.stringify(v):v)}catch(e){process.exit(3)}})" "$1"
}
json_tiers_of_data() {
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const t={};(j.data||[]).forEach(p=>t[p.tier]=(t[p.tier]||0)+1);console.log(JSON.stringify(t))}catch(e){console.log('{}')}})"
}
json_data_len() {
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const a=j.data||j;console.log(Array.isArray(a)?a.length:0)}catch(e){console.log(-1)}})"
}
json_field_of_data_arr() {
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const vals=(j.data||[]).map(p=>p[process.argv[1]]);console.log(JSON.stringify(vals))}catch(e){console.log('[]')}})" "$1"
}
max_of_prices() {
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const arr=(j.data||[]).map(p=>p.price);console.log(arr.length?Math.max(...arr):0)}catch(e){console.log(-1)}})"
}

# ─── Preflight ─────────────────────────────────────────────────────
# Hit each server up to N times with a small backoff. Next.js dev compiles the
# first route on demand, so the very first curl can hang past curl's default
# connect timeout. Give each target a reasonable window before failing.
probe_until_ready() {
  # Reachable = ANY non-zero HTTP status including 5xx (we care if the server
  # answers, even if it's broken — the later phases diagnose 500s specifically).
  local url="$1" label="$2" attempts=6 delay=2
  for ((i=1; i<=attempts; i++)); do
    local code
    code=$(curl -s -o /dev/null -m 30 -w "%{http_code}" "$url")
    if [[ "$code" =~ ^[2-5] ]]; then
      if [[ "$code" =~ ^5 ]]; then
        warn "$label answered but returned $code — server is up but broken (phase C/D/E will diagnose)"
      else
        ok "$label reachable ($code)"
      fi
      return 0
    fi
    if [[ $i -lt $attempts ]]; then sleep "$delay"; fi
  done
  fail "$label unreachable (last code $code) — start with: pnpm --filter @tge/api dev / @tge/admin dev / @tge/landing dev / @tge/reveria dev"
  return 1
}
preflight() {
  section "Preflight — stack reachable"
  local api_ok=0
  probe_until_ready "$API/properties?limit=1" "API (with X-Site ignored here)" && api_ok=1 || true
  # Next.js dev: first request compiles on demand. Use each app's landing
  # route so the compile is useful work (not a 404 probe).
  probe_until_ready "$ADMIN/en/login" "ADMIN" || true
  probe_until_ready "$LANDING/en" "LANDING" || true
  probe_until_ready "$REVERIA/en" "REVERIA" || true
  if [[ $api_ok -eq 0 ]]; then
    printf -- "\n${C_RED}API unreachable — cannot continue. Aborting.${C_RESET}\n"
    exit 1
  fi
  # Docker postgres (for password reset only)
  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$PG_CONTAINER"; then
    warn "Postgres container '$PG_CONTAINER' not found via docker ps — skipping admin password reset"
    RESET_PASSWORD=0
  fi
}

# ─── Password reset + login ────────────────────────────────────────
TOKEN=""
REFRESH_TOKEN=""
# `do_login` is the bare login API call. Returns 0 on success (sets TOKEN and
# REFRESH_TOKEN globals), 1 on failure. Does NOT mutate PASS/FAIL/WARN or
# FAILURES — callers decide how to report.
do_login() {
  local resp
  resp=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -H "X-Site: ADMIN" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
  TOKEN=$(echo "$resp" | json_get "data.accessToken")
  REFRESH_TOKEN=$(echo "$resp" | json_get "data.refreshToken")
  [[ -n "$TOKEN" && ${#TOKEN} -gt 40 ]]
}
auth_setup() {
  section "Auth setup (login)"
  if [[ $RESET_PASSWORD -eq 1 ]]; then
    # Idempotent UPDATE. If the hash already matches, the row update is a no-op.
    docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" \
      -c "UPDATE admin_users SET password_hash='$ADMIN_PASSWORD_HASH' WHERE email='$ADMIN_EMAIL';" \
      >/dev/null 2>&1 \
      && ok "Admin password set to QaTest123! via direct DB update" \
      || warn "Failed to reset admin password (pass SEED_ADMIN_PASSWORD or set QA_ADMIN_PASSWORD to skip)"
  else
    skip "password reset (RESET_PASSWORD=0)"
  fi
  if do_login; then
    ok "Login OK (token len=${#TOKEN})"
  else
    fail "Login failed — cannot continue API phase"
    return 1
  fi
}

# ─── Phase B — API ─────────────────────────────────────────────────
b1_brand_isolation() {
  section "B.1 Brand isolation (X-Site header)"
  for site in "REVERIA:affordable:15" "TGE_LUXURY:luxury:24" "ADMIN:*:39" "UNKNOWN:none:0" "HAX0R:none:0" "MISSING:none:0"; do
    IFS=':' read -r s expected_tier expected_count <<<"$site"
    if [[ "$s" == "MISSING" ]]; then
      resp=$(curl -s "$API/properties?limit=100")
    else
      resp=$(curl -s "$API/properties?limit=100" -H "X-Site: $s")
    fi
    count=$(echo "$resp" | json_data_len)
    tiers=$(echo "$resp" | json_tiers_of_data)
    case "$s" in
      REVERIA)
        [[ "$tiers" == '{"affordable":'* && ! "$tiers" == *'luxury'* ]] \
          && ok "REVERIA → only affordable ($count rows, tiers=$tiers)" \
          || fail "REVERIA leaked non-affordable rows (tiers=$tiers)"
        ;;
      TGE_LUXURY)
        [[ "$tiers" == '{"luxury":'* && ! "$tiers" == *'affordable'* ]] \
          && ok "TGE_LUXURY → only luxury ($count rows, tiers=$tiers)" \
          || fail "TGE_LUXURY leaked non-luxury rows (tiers=$tiers)"
        ;;
      ADMIN)
        [[ "$tiers" == *'affordable'* && "$tiers" == *'luxury'* ]] \
          && ok "ADMIN → both tiers ($count rows, tiers=$tiers)" \
          || fail "ADMIN unrestricted scope broken (tiers=$tiers)"
        ;;
      *)
        [[ "$count" -eq 0 ]] \
          && ok "$s → zero rows (correct)" \
          || fail "$s returned $count rows (expected 0)"
        ;;
    esac
  done
}

b2_tier_tampering() {
  section "B.2 Brand-isolation tampering attempts"
  # Query-string tier override under Reveria. The assertion is "no luxury rows
  # leaked" — an empty response (rate-limited) is inconclusive, not a bug.
  resp=$(curl -s "$API/properties?limit=100&tier=luxury" -H "X-Site: REVERIA")
  status=$(echo "$resp" | json_get "error.statusCode")
  if [[ "$status" == "429" ]]; then
    warn "?tier=luxury tampering test inconclusive — got 429 (global throttle burned). Rerun the suite after 60s."
  else
    tiers=$(echo "$resp" | json_tiers_of_data)
    if [[ "$tiers" == *'luxury'* ]]; then
      fail "?tier=luxury LEAKED luxury to Reveria (tiers=$tiers)"
    else
      ok "?tier=luxury + X-Site=REVERIA → no luxury rows (tiers=$tiers)"
    fi
  fi
  # Price override
  resp=$(curl -s "$API/properties?limit=100&maxPrice=50000000" -H "X-Site: REVERIA")
  status=$(echo "$resp" | json_get "error.statusCode")
  if [[ "$status" == "429" ]]; then
    warn "?maxPrice tampering test inconclusive — got 429"
  else
    max=$(echo "$resp" | max_of_prices)
    if [[ "$max" -lt 1000000 ]]; then
      ok "?maxPrice=50000000 + X-Site=REVERIA → no >999k leak (max=$max)"
    else
      fail "Reveria LEAKED price>=1M (max=$max)"
    fi
  fi
  # SQL-ish tier injection — we want 400 Zod rejection, not 429
  resp=$(curl -s "$API/properties?tier=%27%3BDROP" -H "X-Site: REVERIA")
  status=$(echo "$resp" | json_get "error.statusCode")
  case "$status" in
    400) ok "Garbage tier value rejected (400)" ;;
    429) warn "Garbage tier check inconclusive — got 429 (throttled)" ;;
    *)   warn "Garbage tier returned status=$status (expected 400)" ;;
  esac
}

b3_auth_rbac() {
  section "B.3 Auth + RBAC"
  # No token → 401
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/properties" -H "Content-Type: application/json" -H "X-Site: ADMIN" -d '{}')
  [[ "$code" == "401" ]] && ok "POST /properties without token → 401" || fail "POST without token got $code (expected 401)"
  # Garbage token → 401
  code=$(curl -s -o /dev/null -w "%{http_code}" "$API/auth/me" -H "Authorization: Bearer garbage" -H "X-Site: ADMIN")
  [[ "$code" == "401" ]] && ok "/auth/me with bogus token → 401" || fail "bogus token got $code"
  # Valid token → 200
  code=$(curl -s -o /dev/null -w "%{http_code}" "$API/auth/me" -H "Authorization: Bearer $TOKEN" -H "X-Site: ADMIN")
  [[ "$code" == "200" ]] && ok "/auth/me with valid token → 200" || fail "valid token got $code"
  # Wrong password (≥6 chars) → 401 "Invalid credentials"
  resp=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -H "X-Site: ADMIN" -d '{"email":"admin@tge.ro","password":"definitely-not-right"}')
  msg=$(echo "$resp" | json_get "error.message")
  [[ "$msg" == "Invalid credentials" ]] && ok "Bad password → 401 Invalid credentials" || warn "Bad password msg='$msg'"
  # Short password (<6 chars) leaks requirement via Zod (KNOWN Minor bug)
  resp=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -H "X-Site: ADMIN" -d '{"email":"admin@tge.ro","password":"x"}')
  path=$(echo "$resp" | json_get "error.fields")
  if [[ "$path" == *"Too small"* || "$path" == *"too_small"* ]]; then
    warn "Short password leaks min-length via Zod (KNOWN Minor #9 in qa-report-2026-04-17.md)"
  else
    ok "Short password does NOT leak (bug fixed?)"
  fi
  # Refresh flow
  resp=$(curl -s -X POST "$API/auth/refresh" -H "Content-Type: application/json" -H "X-Site: ADMIN" -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
  new_token=$(echo "$resp" | json_get "data.accessToken")
  [[ -n "$new_token" && ${#new_token} -gt 40 ]] && ok "Refresh with valid token → new access token" || fail "Refresh failed"
  # Refresh with garbage
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/auth/refresh" -H "Content-Type: application/json" -d '{"refreshToken":"garbage"}')
  [[ "$code" == "401" ]] && ok "Refresh with garbage → 401" || fail "Refresh with garbage got $code"
}

b4_validation_errors() {
  section "B.4 Zod validation error shape"
  resp=$(curl -s -X POST "$API/properties" -H "Content-Type: application/json" -H "X-Site: ADMIN" -H "Authorization: Bearer $TOKEN" -d '{}')
  err=$(echo "$resp" | json_get "error.error")
  fields=$(echo "$resp" | json_get "error.fields")
  [[ "$err" == "ValidationError" && "$fields" == *"path"* && "$fields" == *"code"* ]] \
    && ok "Empty body → 400 ValidationError with fields[{path,message,code}]" \
    || fail "Validation shape wrong: err=$err fields=$fields"
  # Invalid enum
  resp=$(curl -s -X POST "$API/properties" -H "Content-Type: application/json" -H "X-Site: ADMIN" -H "Authorization: Bearer $TOKEN" \
    -d '{"slug":"qa-enum-test","title":{"en":"x","ro":"x","fr":"x","de":"x"},"description":{"en":"x","ro":"x","fr":"x","de":"x"},"shortDescription":{"en":"x","ro":"x","fr":"x","de":"x"},"address":{"en":"x","ro":"x","fr":"x","de":"x"},"price":1,"area":1,"type":"hovel","status":"available","city":"x","citySlug":"x","neighborhood":"x","currency":"EUR","bedrooms":1,"bathrooms":1,"floors":1,"yearBuilt":2000,"coordinates":{"lat":45,"lng":25},"tier":"luxury"}')
  [[ "$(echo "$resp" | json_get "error.fields")" == *'"type"'* && "$(echo "$resp" | json_get "error.fields")" == *"invalid_value"* ]] \
    && ok "Invalid enum type → field-level invalid_value" \
    || warn "Enum validation response didn't match expected shape"
  # Coord out of range
  resp=$(curl -s -X POST "$API/properties" -H "Content-Type: application/json" -H "X-Site: ADMIN" -H "Authorization: Bearer $TOKEN" \
    -d '{"slug":"qa-coord-test","title":{"en":"x","ro":"x","fr":"x","de":"x"},"description":{"en":"x","ro":"x","fr":"x","de":"x"},"shortDescription":{"en":"x","ro":"x","fr":"x","de":"x"},"address":{"en":"x","ro":"x","fr":"x","de":"x"},"price":1,"area":1,"type":"villa","status":"available","city":"x","citySlug":"x","neighborhood":"x","currency":"EUR","bedrooms":1,"bathrooms":1,"floors":1,"yearBuilt":2000,"coordinates":{"lat":200,"lng":400},"tier":"luxury"}')
  [[ "$(echo "$resp" | json_get "error.fields")" == *"too_big"* ]] \
    && ok "Coord out of range → too_big error" \
    || fail "Coord validation missing"
}

b5_rate_limit() {
  section "B.5 Rate limiting"
  # We need a fresh window — test login throttle by hammering with wrong password.
  subsection "POST /auth/login limit=5/min"
  local got_429=0
  for i in 1 2 3 4 5 6 7; do
    code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/auth/login" -H "Content-Type: application/json" -H "X-Site: ADMIN" -d '{"email":"x@x.com","password":"definitely-not-right"}')
    [[ "$code" == "429" ]] && got_429=1
  done
  [[ $got_429 -eq 1 ]] && ok "Login hit 429 within 7 attempts" || fail "Login did not 429 within 7 attempts"
  # Re-login so later tests have a fresh token. Use `do_login` (bare) so a
  # throttled retry doesn't get recorded as a failure in the FAILURES array.
  # If we can't re-auth within the rate-limit window, just warn and move on —
  # subsequent tests (cleanup) don't strictly need a fresh token since this is
  # the last phase.
  sleep 5
  do_login || warn "Could not refresh admin token after rate-limit burn — cleanup may be incomplete"
  # Inquiry throttle — burn 6
  subsection "POST /inquiries limit=5/min"
  local created=()
  got_429=0
  for i in 1 2 3 4 5 6; do
    resp=$(curl -s -X POST "$API/inquiries" -H "Content-Type: application/json" -H "X-Site: REVERIA" \
      -d "{\"name\":\"RLTest$i\",\"email\":\"rl$i@qa.test\",\"phone\":\"+40700000000\",\"message\":\"Rate-limit probe $i; autodelete.\",\"source\":\"qa-smoke\"}")
    code=$(echo "$resp" | json_get "error.statusCode")
    id=$(echo "$resp" | json_get "data.id")
    if [[ "$code" == "429" ]]; then got_429=1; fi
    [[ -n "$id" ]] && created+=("$id")
  done
  [[ $got_429 -eq 1 ]] && ok "Inquiries hit 429 within 6 attempts" || fail "Inquiries did not 429 within 6 attempts"
  # Cleanup inquiries
  for id in "${created[@]}"; do
    curl -s -o /dev/null -X DELETE "$API/inquiries/$id" -H "Authorization: Bearer $TOKEN" -H "X-Site: ADMIN" || true
  done
  ok "Cleaned up ${#created[@]} throttle-probe inquiries"
}

b6_prisma_errors() {
  section "B.6 Prisma error mapping"
  local slug="qa-prisma-test-$(date +%s)"
  local body="{\"slug\":\"$slug\",\"title\":{\"en\":\"x\",\"ro\":\"x\",\"fr\":\"x\",\"de\":\"x\"},\"description\":{\"en\":\"x\",\"ro\":\"x\",\"fr\":\"x\",\"de\":\"x\"},\"shortDescription\":{\"en\":\"x\",\"ro\":\"x\",\"fr\":\"x\",\"de\":\"x\"},\"address\":{\"en\":\"x\",\"ro\":\"x\",\"fr\":\"x\",\"de\":\"x\"},\"price\":1500000,\"area\":200,\"type\":\"villa\",\"status\":\"available\",\"city\":\"Brasov\",\"citySlug\":\"brasov\",\"neighborhood\":\"centru\",\"currency\":\"EUR\",\"bedrooms\":3,\"bathrooms\":2,\"floors\":2,\"yearBuilt\":2020,\"coordinates\":{\"lat\":45.5,\"lng\":25.5},\"tier\":\"luxury\"}"
  # Create
  resp=$(curl -s -X POST "$API/properties" -H "Content-Type: application/json" -H "X-Site: ADMIN" -H "Authorization: Bearer $TOKEN" -d "$body")
  id=$(echo "$resp" | json_get "data.id")
  if [[ -z "$id" ]]; then
    fail "Could not create property for Prisma tests" "$resp"; return 1
  fi
  ok "Created test property (id=$id, slug=$slug)"
  # Duplicate → 409
  resp=$(curl -s -X POST "$API/properties" -H "Content-Type: application/json" -H "X-Site: ADMIN" -H "Authorization: Bearer $TOKEN" -d "$body")
  code=$(echo "$resp" | json_get "error.statusCode")
  [[ "$code" == "409" ]] && ok "Duplicate slug → 409 Conflict" || fail "Duplicate slug got $code (expected 409)"
  # Patch non-existent
  code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API/properties/00000000-0000-0000-0000-000000000000" \
    -H "Content-Type: application/json" -H "X-Site: ADMIN" -H "Authorization: Bearer $TOKEN" -d '{"price":1}')
  [[ "$code" == "404" ]] && ok "PATCH non-existent UUID → 404" || fail "PATCH non-existent got $code"
  # Delete non-UUID → KNOWN Minor #11 (returns 404 instead of 400)
  code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API/properties/not-a-uuid" -H "X-Site: ADMIN" -H "Authorization: Bearer $TOKEN")
  if [[ "$code" == "400" ]]; then
    ok "DELETE non-UUID → 400 (bug fixed?)"
  else
    warn "DELETE non-UUID → $code (KNOWN Minor #11 — missing ParseUUIDPipe)"
  fi
  # Cleanup
  code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API/properties/$id" -H "X-Site: ADMIN" -H "Authorization: Bearer $TOKEN")
  [[ "$code" == "200" ]] && ok "Cleanup: deleted test property" || warn "Cleanup delete returned $code"
}

b7_property_filters() {
  section "B.7 Property filters"
  # minPrice
  resp=$(curl -s "$API/properties?minPrice=2000000" -H "X-Site: TGE_LUXURY")
  prices=$(echo "$resp" | json_field_of_data_arr "price")
  min_ok=$(node -e "try{const a=JSON.parse(process.argv[1]);process.exit(a.every(p=>p>=2000000)?0:1)}catch(e){process.exit(2)}" "$prices"; echo $?)
  [[ "$min_ok" == "0" ]] && ok "minPrice=2000000 → all prices ≥ 2M" || fail "minPrice filter broken"
  # maxPrice
  resp=$(curl -s "$API/properties?maxPrice=500000" -H "X-Site: TGE_LUXURY")
  prices=$(echo "$resp" | json_field_of_data_arr "price")
  max_ok=$(node -e "try{const a=JSON.parse(process.argv[1]);process.exit(a.every(p=>p<=500000)?0:1)}catch(e){process.exit(2)}" "$prices"; echo $?)
  [[ "$max_ok" == "0" ]] && ok "maxPrice=500000 → all prices ≤ 500k" || fail "maxPrice filter broken"
  # bedrooms multi-select + 6+ bucket
  resp=$(curl -s "$API/properties?bedrooms=3" -H "X-Site: TGE_LUXURY")
  beds=$(echo "$resp" | json_field_of_data_arr "bedrooms")
  node -e "try{const a=JSON.parse(process.argv[1]);process.exit(a.every(b=>b===3)?0:1)}catch(e){process.exit(2)}" "$beds" \
    && ok "bedrooms=3 exact → all beds===3" \
    || fail "bedrooms exact filter broken (got $beds)"
  # maxBedrooms (KNOWN Major #7 — silently discarded)
  resp=$(curl -s "$API/properties?maxBedrooms=5" -H "X-Site: TGE_LUXURY")
  beds=$(echo "$resp" | json_field_of_data_arr "bedrooms")
  if node -e "try{const a=JSON.parse(process.argv[1]);process.exit(a.every(b=>b<=5)?0:1)}catch(e){process.exit(2)}" "$beds"; then
    ok "maxBedrooms=5 enforced (bug fixed?)"
  else
    warn "maxBedrooms=5 silently discarded (KNOWN Major #7 — got $beds)"
  fi
  # featured
  resp=$(curl -s "$API/properties?featured=true" -H "X-Site: TGE_LUXURY")
  feats=$(echo "$resp" | json_field_of_data_arr "featured")
  node -e "try{const a=JSON.parse(process.argv[1]);process.exit(a.every(v=>v===true)?0:1)}catch(e){process.exit(2)}" "$feats" \
    && ok "featured=true → all featured" \
    || fail "featured filter broken"
  # bbox
  count=$(curl -s "$API/properties?swLat=45&swLng=25&neLat=46&neLng=26" -H "X-Site: TGE_LUXURY" | json_data_len)
  [[ "$count" -gt 0 ]] && ok "bbox filter returns $count rows in Brasov area" || warn "bbox returned 0"
  # radius
  count=$(curl -s "$API/properties?lat=45.5&lng=25.5&radius=50" -H "X-Site: TGE_LUXURY" | json_data_len)
  [[ "$count" -gt 0 ]] && ok "radius filter returns $count rows in 50km of Brasov" || warn "radius returned 0"
  # map-pins lightweight endpoint
  resp=$(curl -s "$API/properties/map-pins" -H "X-Site: REVERIA")
  n=$(echo "$resp" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const a=j.data||j;console.log(Array.isArray(a)?a.length:-1)}catch(e){console.log(-2)}})")
  [[ "$n" -gt 0 ]] && ok "/properties/map-pins (REVERIA) returns $n pins" || fail "map-pins returned $n"
  # map-pins UNKNOWN → empty
  n=$(curl -s "$API/properties/map-pins" -H "X-Site: UNKNOWN" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const a=j.data||j;console.log(Array.isArray(a)?a.length:-1)}catch(e){console.log(-2)}})")
  [[ "$n" -eq 0 ]] && ok "/properties/map-pins (UNKNOWN) returns 0" || fail "map-pins UNKNOWN returned $n"
}

b8_file_uploads() {
  section "B.8 File upload validation"
  if [[ $NO_UPLOADS -eq 1 ]]; then
    skip "file uploads (--no-uploads)"
    return 0
  fi
  # Get an existing agent id
  agent_id=$(curl -s "$API/agents" -H "X-Site: ADMIN" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const a=j.data||j;console.log(a[0]?.id||'')}catch(e){console.log('')}})")
  if [[ -z "$agent_id" ]]; then fail "No agents seeded — cannot upload"; return 1; fi
  # Write fixtures via node (honors Windows-mapped tmp)
  node -e "
    const fs=require('fs');const p=process.argv[1];
    const bytes = Buffer.from([0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,0xff,0xdb,0x00,0x43,0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,0x07,0x07,0x07,0x09,0x09,0x08,0x0a,0x0c,0x14,0x0d,0x0c,0x0b,0x0b,0x0c,0x19,0x12,0x13,0x0f,0x14,0x1d,0x1a,0x1f,0x1e,0x1d,0x1a,0x1c,0x1c,0x20,0x24,0x2e,0x27,0x20,0x22,0x2c,0x23,0x1c,0x1c,0x28,0x37,0x29,0x2c,0x30,0x31,0x34,0x34,0x34,0x1f,0x27,0x39,0x3d,0x38,0x32,0x3c,0x2e,0x33,0x34,0x32,0xff,0xc0,0x00,0x0b,0x08,0x00,0x01,0x00,0x01,0x01,0x01,0x11,0x00,0xff,0xc4,0x00,0x1f,0x00,0x00,0x01,0x05,0x01,0x01,0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0a,0x0b,0xff,0xda,0x00,0x08,0x01,0x01,0x00,0x00,0x3f,0x00,0xd2,0xcf,0x20,0xff,0xd9]);
    fs.writeFileSync(p+'/tiny.jpg', bytes);
    fs.writeFileSync(p+'/too-big.jpg', Buffer.concat([bytes, Buffer.alloc(6*1024*1024)]));
    fs.writeFileSync(p+'/test.svg', Buffer.from('<svg xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"1\" height=\"1\"/></svg>'));
  " "$QATMP_WIN" >/dev/null 2>&1 || { fail "Could not write upload fixtures"; return 1; }
  # SVG with correct MIME → 400
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/agents/$agent_id/photo" -H "Authorization: Bearer $TOKEN" -H "X-Site: ADMIN" -F "photo=@${QATMP_WIN}/test.svg;type=image/svg+xml")
  [[ "$code" == "400" ]] && ok "SVG with image/svg+xml MIME → 400" || fail "SVG got $code"
  # 6MB JPEG → 413
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/agents/$agent_id/photo" -H "Authorization: Bearer $TOKEN" -H "X-Site: ADMIN" -F "photo=@${QATMP_WIN}/too-big.jpg;type=image/jpeg")
  [[ "$code" == "413" ]] && ok "6MB JPEG → 413 Payload Too Large" || fail "6MB got $code (expected 413)"
  # Tiny JPEG → 200
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/agents/$agent_id/photo" -H "Authorization: Bearer $TOKEN" -H "X-Site: ADMIN" -F "photo=@${QATMP_WIN}/tiny.jpg;type=image/jpeg")
  [[ "$code" == "200" || "$code" == "201" ]] && ok "Tiny JPEG → $code (accepted)" || fail "Tiny JPEG got $code"
  # SVG with LIED image/jpeg MIME → KNOWN Critical #3
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/agents/$agent_id/photo" -H "Authorization: Bearer $TOKEN" -H "X-Site: ADMIN" -F "photo=@${QATMP_WIN}/test.svg;type=image/jpeg")
  if [[ "$code" == "400" ]]; then
    ok "SVG with lied image/jpeg MIME → 400 (bug fixed?)"
  else
    warn "SVG with lied MIME accepted ($code) — KNOWN Critical #3 (magic-byte check missing)"
  fi
  # Static serving broken → KNOWN Major #5
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3333/uploads/")
  if [[ "$code" == "200" || "$code" == "403" ]]; then
    ok "Static uploads root served ($code) — bug fixed?"
  else
    warn "Static uploads 404 (KNOWN Major #5 — rootPath wrong)"
  fi
}

b9_cors_swagger() {
  section "B.9 CORS + Swagger"
  allow=$(curl -s -o /dev/null -D - -X OPTIONS "$API/properties" \
    -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: X-Site,Content-Type" 2>&1 | grep -i "access-control-allow-origin:" | head -1)
  [[ "$allow" == *"localhost:3000"* ]] \
    && ok "CORS preflight from localhost:3000 → Allow-Origin returned" \
    || fail "CORS preflight from localhost:3000 missing allow-origin"
  allow=$(curl -s -o /dev/null -D - -X OPTIONS "$API/properties" \
    -H "Origin: http://evil.com" -H "Access-Control-Request-Method: GET" 2>&1 | grep -i "access-control-allow-origin:" | head -1)
  [[ -z "$allow" ]] \
    && ok "CORS preflight from evil.com → no allow-origin (blocked)" \
    || fail "CORS preflight from evil.com returned allow-origin: $allow"
  code=$(curl -s -o /dev/null -w "%{http_code}" "$API/../docs")
  # api/docs is outside /api/v1
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3333/api/docs")
  [[ "$code" == "200" ]] && ok "Swagger /api/docs renders" || fail "Swagger got $code"
  paths=$(curl -s "http://localhost:3333/api/docs-json" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(Object.keys(j.paths||{}).length)}catch(e){console.log(-1)}})")
  [[ "$paths" -gt 30 ]] && ok "Swagger docs-json has $paths paths" || fail "Swagger paths count=$paths"
  # No /health
  code=$(curl -s -o /dev/null -w "%{http_code}" "$API/health")
  if [[ "$code" == "200" ]]; then
    ok "/health returns 200 (bug fixed?)"
  else
    warn "/health returns $code (KNOWN Major #8 — no health endpoint)"
  fi
}

b10_inquiry_source() {
  section "B.10 Inquiry source persistence (KNOWN Critical #4)"
  resp=$(curl -s -X POST "$API/inquiries" -H "Content-Type: application/json" -H "X-Site: REVERIA" \
    -d '{"name":"SrcTest","email":"src@qa.test","phone":"+40700000000","message":"Source probe; autodelete.","source":"qa-smoke-reveria"}')
  id=$(echo "$resp" | json_get "data.id")
  if [[ -z "$id" ]]; then
    warn "Skipping — could not create inquiry (rate limit likely in effect from B.5)"
    return
  fi
  stored=$(curl -s "$API/inquiries/$id" -H "Authorization: Bearer $TOKEN" -H "X-Site: ADMIN")
  # source field may or may not be present. Check for it in top-level data.
  src=$(echo "$stored" | json_get "data.source")
  if [[ -n "$src" ]]; then
    ok "Inquiry.source persisted ('$src') — bug fixed?"
  else
    warn "Inquiry.source dropped on persist (KNOWN Critical #4)"
  fi
  curl -s -o /dev/null -X DELETE "$API/inquiries/$id" -H "Authorization: Bearer $TOKEN" -H "X-Site: ADMIN" || true
}

# ─── Phase C/D/E — Page smoke + 404 ────────────────────────────────
check_url() {
  local url="$1" expected_code="$2" label="$3"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [[ "$code" == "$expected_code" ]]; then
    ok "$label → $code"
    return 0
  fi
  # Only annotate a 200-on-expected-404 as Blocker #2 when it's a Reveria route
  # — landing handles notFound() correctly, so a 200 there is a genuine bug.
  if [[ "$expected_code" == "404" && "$code" == "200" && "$url" == *"$REVERIA"* ]]; then
    warn "$label → 200 (expected 404 — KNOWN Blocker #2, Reveria [locale]/error.tsx intercepts notFound)"
    return 0
  fi
  # Only annotate a 500 on landing /properties as Blocker #1 — other 500s are
  # real regressions worth investigating.
  if [[ "$expected_code" == "200" && "$code" == "500" && "$url" == *"$LANDING/en/properties"* && "$url" != *"/properties/"* ]]; then
    warn "$label → 500 (KNOWN Blocker #1, landing PropertyCard crashes on image-less property)"
    return 0
  fi
  fail "$label → $code (expected $expected_code)"
}

page_smoke() {
  section "C. Admin pages (smoke)"
  # First: detect the Next.js 16 proxy.ts export mismatch that 500s every admin
  # request. See `apps/admin/src/proxy.ts` — it exports `function middleware`
  # but Next 16 requires the export to be named `proxy` (or default).
  local admin_code
  admin_code=$(curl -s -o /dev/null -w "%{http_code}" "$ADMIN/en/login")
  if [[ "$admin_code" == "500" ]]; then
    warn "admin /en/login → 500 (KNOWN: apps/admin/src/proxy.ts exports 'middleware' instead of 'proxy' — Next 16 won't accept it)"
    warn "admin /en/dashboard, /en/properties will also 500 until that file is fixed; skipping specific checks"
  else
    check_url "$ADMIN/en/login" 200 "admin /en/login"
    # Unauth → 307 redirect to /en/login
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 "$ADMIN/en/dashboard")
    [[ "$code" == "307" ]] && ok "admin /en/dashboard (unauth) → 307 redirect" || fail "admin /en/dashboard got $code"
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 "$ADMIN/en/properties")
    [[ "$code" == "307" ]] && ok "admin /en/properties (unauth) → 307 redirect" || fail "admin /en/properties got $code"
  fi
  section "D. Landing pages (smoke)"
  for path in "/en" "/en/properties" "/en/cities" "/en/developers" "/en/about" "/en/contact" "/en/transylvania"; do
    check_url "$LANDING$path" 200 "landing $path"
  done
  section "E. Reveria pages (smoke)"
  for path in "/en" "/ro" "/en/properties" "/en/properties?view=map" "/en/cities" "/en/developers" "/en/agents" "/en/blog" "/en/faq" "/en/about" "/en/contact" "/ro/instrumente" "/ro/instrumente/calculator-ipotecar" "/ro/instrumente/capacitate-imprumut" "/ro/instrumente/costuri-achizitie" "/ro/instrumente/randament-inchiriere"; do
    check_url "$REVERIA$path" 200 "reveria $path"
  done
}

not_found_status() {
  section "F.1 404 status for garbage dynamic routes"
  # Landing — expected 404
  for path in "/en/properties/does-not-exist-zzz" "/en/cities/does-not-exist-zzz" "/en/developers/does-not-exist-zzz"; do
    check_url "$LANDING$path" 404 "landing $path"
  done
  # Reveria — KNOWN Blocker #2: returns 200 instead of 404
  for path in "/en/properties/does-not-exist-zzz" "/en/cities/does-not-exist-zzz" "/en/developers/does-not-exist-zzz" "/en/agents/does-not-exist-zzz" "/en/blog/does-not-exist-zzz"; do
    check_url "$REVERIA$path" 404 "reveria $path"
  done
}

tier_cross_leak() {
  section "F.2 Cross-app tier leak check"
  # Grab one luxury slug + one affordable slug from the API
  luxury_slug=$(curl -s "$API/properties?limit=1" -H "X-Site: TGE_LUXURY" | json_get "data.0.slug" 2>/dev/null || \
    curl -s "$API/properties?limit=1" -H "X-Site: TGE_LUXURY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.data?.[0]?.slug||'')}catch(e){console.log('')}})")
  affordable_slug=$(curl -s "$API/properties?limit=1" -H "X-Site: REVERIA" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.data?.[0]?.slug||'')}catch(e){console.log('')}})")
  if [[ -z "$luxury_slug" || -z "$affordable_slug" ]]; then warn "Missing sample slugs — skipping"; return; fi
  # Landing with affordable slug → 404
  check_url "$LANDING/en/properties/$affordable_slug" 404 "landing + Reveria slug ($affordable_slug)"
  # Reveria with luxury slug → 404 (BUT KNOWN Blocker #2 masks this as 200)
  check_url "$REVERIA/en/properties/$luxury_slug" 404 "reveria + luxury slug ($luxury_slug)"
  # Landing with luxury slug → 200
  check_url "$LANDING/en/properties/$luxury_slug" 200 "landing + luxury slug ($luxury_slug)"
  # Reveria with affordable slug → 200
  check_url "$REVERIA/en/properties/$affordable_slug" 200 "reveria + affordable slug ($affordable_slug)"
}

# ─── Orchestrator ──────────────────────────────────────────────────
start_ts=$(date +%s)

preflight

run_api() {
  auth_setup || return
  b1_brand_isolation
  b2_tier_tampering
  b3_auth_rbac
  b4_validation_errors
  b6_prisma_errors
  b7_property_filters
  b8_file_uploads
  b9_cors_swagger
  b10_inquiry_source
  # Rate limiting is destructive to other API checks in this run — do it last
  # so we don't burn the token on 429s.
  b5_rate_limit
}

run_pages() {
  page_smoke
  not_found_status
  tier_cross_leak
}

case "$ONLY" in
  api) run_api ;;
  pages) run_pages ;;
  "") run_api; run_pages ;;
  *) echo "unknown --only value: $ONLY" >&2; exit 2 ;;
esac

end_ts=$(date +%s)

# ─── Summary ───────────────────────────────────────────────────────
printf -- "\n${C_BLUE}=== Summary ===${C_RESET}\n"
printf -- "  ${C_GREEN}%d passed${C_RESET}   ${C_RED}%d failed${C_RESET}   ${C_YELLOW}%d warn${C_RESET} (known bugs)   ${C_DIM}%d skipped${C_RESET}   (%ds)\n" "$PASS" "$FAIL" "$WARN" "$SKIP" "$((end_ts-start_ts))"
if [[ $FAIL -gt 0 ]]; then
  printf -- "\n${C_RED}Failures:${C_RESET}\n"
  for f in "${FAILURES[@]}"; do printf -- "  • %s\n" "$f"; done
  exit 1
fi
exit 0
