# Contributing

Short reference for operational tasks that aren't obvious from reading the code.

## Seeding prod after a `packages/data/**` change

Whenever you merge a PR that edits anything under `packages/data/**` or `apps/api/prisma/seed.ts`, the new rows do **not** ship to prod automatically. Fly's `release_command` only runs `prisma migrate deploy`, not `prisma db seed`. After the `deploy-api` workflow goes green on `main`, run:

```bash
fly ssh console -a tge-api -C "sh -c 'cd /app && npx prisma db seed'"
```

This is idempotent (every write is an upsert keyed by a natural id, and `SEED_RESET` is off by default) — safe to re-run. Manual on purpose: keeps deploys fast and keeps seed failures out of the release rollback path.

## Rotating the Fly deploy token

`FLY_API_TOKEN` lives in GitHub repo secrets (`vlad-mihet/transylvania-grand-estate`). The token was installed on **2026-04-18** with a 1-year expiry — it will stop working around **2027-04-18**.

Regenerate (signed in to Fly and GitHub CLI):

```bash
fly tokens create deploy -a tge-api --expiry 8760h \
  | gh secret set FLY_API_TOKEN --repo vlad-mihet/transylvania-grand-estate
```

When the token expires the `deploy-api.yml` workflow fails fast with `Error: no access token available. Please login with 'flyctl auth login'`. Rotating the secret and re-running the failed workflow is the fix — no code changes needed.

## One-off prod DB queries (read-only)

When you need to audit prod state, pipe a node script via `fly ssh` — Prisma client is already installed in the container:

```bash
cat << 'EOF' | fly ssh console -a tge-api -C "sh -c 'cd /app && node -'"
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.city.count().then(n => console.log("cities:", n)).finally(() => p.$disconnect());
EOF
```

Keep these scripts read-only; for writes use a tracked migration or a documented seed run.
