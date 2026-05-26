#!/usr/bin/env bash
#
# setup-mac.sh — one-shot local dev bootstrap for macOS (works on Linux too).
#
#   git clone https://github.com/vlad-mihet/transylvania-grand-estate.git
#   cd transylvania-grand-estate
#   ./scripts/setup-mac.sh
#
# Idempotent: safe to re-run. It will NOT overwrite an existing .env file.
#
# What it does:
#   1. Verifies Node 22+ and Docker are installed.
#   2. Activates pnpm via corepack (pinned to match the Dockerfiles).
#   3. Installs workspace deps.
#   4. Seeds gitignored env files from their .example templates.
#   5. Starts Postgres 16 via docker compose and waits for it to be ready.
#   6. Builds the shared packages the API + seed need at runtime
#      (@tge/locale, @tge/types, @tge/data).
#   7. Runs prisma generate + migrate deploy + db seed.
#
# After it finishes, run `pnpm dev:all` to start every app.

set -euo pipefail

# Pin pnpm to the same version the Dockerfiles use. pnpm@latest has broken
# onlyBuiltDependencies under --frozen-lockfile before.
PNPM_VERSION="10.13.1"

# Resolve repo root (this script lives in scripts/).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

bold()  { printf "\033[1m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
step()  { printf "\n\033[1;36m▸ %s\033[0m\n" "$1"; }

# ── 1. Prerequisites ────────────────────────────────────────────────────────
step "Checking prerequisites"

if ! command -v node >/dev/null 2>&1; then
  red "Node.js not found. Install Node 22+ (e.g. \`brew install node\` or nvm) and re-run."
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  red "Node $(node -v) is too old — this repo needs Node 22+."
  exit 1
fi
green "Node $(node -v) ✓"

if ! command -v docker >/dev/null 2>&1; then
  red "Docker not found. Install Docker Desktop for Mac (https://docs.docker.com/desktop/) and re-run."
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  red "Docker is installed but not running. Start Docker Desktop and re-run."
  exit 1
fi
green "Docker ✓"

# ── 2. pnpm via corepack ─────────────────────────────────────────────────────
step "Activating pnpm@${PNPM_VERSION} via corepack"
corepack enable
corepack prepare "pnpm@${PNPM_VERSION}" --activate
green "$(pnpm -v) ✓"

# ── 3. Install deps ──────────────────────────────────────────────────────────
step "Installing workspace dependencies (pnpm install)"
pnpm install

# ── 4. Env files ─────────────────────────────────────────────────────────────
step "Seeding env files from templates (existing files are left untouched)"
seed_env() {
  local target="$1" template="$2"
  if [ -f "$target" ]; then
    yellow "  kept   $target (already exists)"
  elif [ -f "$template" ]; then
    cp "$template" "$target"
    green  "  created $target  ←  $template"
  else
    red "  MISSING template $template — skipping $target"
  fi
}
seed_env "apps/api/.env"            "apps/api/.env.example"
seed_env "apps/admin/.env"          "apps/admin/.env.example"
seed_env "apps/landing/.env.local"  "apps/landing/.env.example"
seed_env "apps/academy/.env.local"  "apps/academy/.env.local.example"
# revery self-defaults its API URL in next.config.ts — no env file needed.

# ── 5. Postgres ──────────────────────────────────────────────────────────────
step "Starting Postgres 16 (docker compose up -d)"
docker compose up -d

printf "  waiting for Postgres to accept connections"
for _ in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    printf "\n"; green "  Postgres is ready ✓"; break
  fi
  printf "."
  sleep 1
done
if ! docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
  printf "\n"; red "  Postgres did not become ready in time. Check \`docker compose logs postgres\`."
  exit 1
fi

# ── 6. Build shared packages the API + seed need at runtime ─────────────────
step "Building shared packages (@tge/locale, @tge/types, @tge/data)"
# Their package.json exports.node points at dist/, so the API (Node) and the
# prisma seed (which imports @tge/data) need compiled JS present.
pnpm --filter @tge/locale build
pnpm --filter @tge/types build
pnpm --filter @tge/data build

# ── 7. Prisma ────────────────────────────────────────────────────────────────
step "Generating Prisma client + applying migrations + seeding"
pnpm --filter @tge/api exec prisma generate
pnpm --filter @tge/api exec prisma migrate deploy
pnpm --filter @tge/api exec prisma db seed

# ── Done ─────────────────────────────────────────────────────────────────────
bold ""
green "✅ Setup complete."
cat <<'EOF'

Next steps
──────────
  pnpm dev:all          # start every app + the API at once
  # or individually:
  pnpm dev:api          # API      → http://localhost:4000  (Swagger: /api/docs)
  pnpm dev              # Landing  → http://localhost:3050
  pnpm dev:admin        # Admin    → http://localhost:3051
  pnpm dev:academy      # Academy  → http://localhost:3053
  pnpm --filter @tge/revery dev   # Revery → http://localhost:3052

  pnpm --filter @tge/api exec prisma studio   # visual DB browser

Postgres runs in Docker on localhost:5435 (user: postgres, pass: password, db: tge_dev).
Stop it with `docker compose down`; add `-v` to also wipe the data volume.
EOF
