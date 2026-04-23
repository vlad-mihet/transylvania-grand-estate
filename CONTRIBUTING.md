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

## Windows: `prisma generate` fails with `EPERM` on `query_engine-windows.dll.node`

Prisma's default library engine writes `.prisma/client/query_engine-windows.dll.node` on generate. If any Node process is still holding that file — a running `nest start --watch`, a prior `pnpm dev` in another terminal, VS Code's TypeScript server, a leftover Jest worker — the rename-from-`.tmp` step fails and generate aborts with:

```
EPERM: operation not permitted, rename '…/query_engine-windows.dll.node.tmp12345' -> '…/query_engine-windows.dll.node'
```

Two recovery paths, in order of preference:

1. **Fix the root cause**: `tasklist | findstr node.exe`, stop the offending dev server / editor, retry `prisma generate`. This is the right long-term answer — the library engine is fastest.
2. **Binary-engine workaround**: set `PRISMA_CLIENT_ENGINE_TYPE=binary` in `apps/api/.env`. Prisma then writes a separate `query-engine-windows.exe` instead of the locked `.dll.node`. Same API, slightly slower startup. Drop the flag once you've isolated and stopped the process that was holding the lock.

This is Windows-specific; macOS/Linux file handles release on process exit, so the issue never surfaces there.

## E2E spec conventions

New e2e specs under `apps/api/test/` follow two conventions:

1. **Side-effect import `per-test-reset` first.** The very first line of the spec should be `import './per-test-reset';`. That file registers a top-level `afterEach` that `TRUNCATE`s every data table (and an `afterAll` that disconnects the shared Prisma client). Because Jest's `setupFiles` runs before the framework globals are installed — `afterEach` isn't defined there — registering the hook via an in-spec import is the reliable alternative. Without this line the spec will cross-contaminate the next spec through the `admin_users` unique email index.

2. **Default import for supertest.** Use `import request from 'supertest'`, not `import * as request from 'supertest'`. Under `ts-jest` with `isolatedModules: true`, the namespace form returns an uncallable object and the spec fails with `request is not a function`.
