# Transylvania Grand Estate

Luxury real estate consultancy platform — an Nx monorepo powered by Next.js, NestJS, and TypeScript.

## Project Structure

```
apps/
  landing/          Public TGE website (Next.js 16, App Router) — port 3050
  admin/            Admin panel (Next.js 16, App Router) — port 3051
  revery/           Reveria affordable-properties site (Next.js 16) — port 3052
  academy/          Study platform (Next.js 16) — port 3053
  api/              REST API (NestJS, Prisma ORM) — port 4000

packages/
  types/            Shared TypeScript type definitions (@tge/types)
  data/             Static data — properties, developers, cities, etc. (@tge/data)
  api-client/       Shared fetch client; stamps the X-Site brand header (@tge/api-client)
  locale/           Locale resolution shared by API + apps (@tge/locale)
  utils/            Utility functions — cn(), formatPrice(), formatArea() (@tge/utils)
  hooks/            React hooks — useIntersectionObserver, useScrollDirection (@tge/hooks)
  ui/               shadcn/ui primitives + shared components (@tge/ui)
  i18n/             Shared i18n routing & navigation config (@tge/i18n)
  branding/         Per-site brand tokens (@tge/branding)
  assets/           Shared binary assets, synced into each app's public/ (@tge/assets)
  tailwind-config/  Shared TailwindCSS 4 theme (@tge/tailwind-config)
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack), NestJS 11
- **Language:** TypeScript 5
- **Database:** PostgreSQL 16, Prisma ORM
- **Styling:** TailwindCSS 4, shadcn/ui
- **Internationalization:** next-intl (English & Romanian)
- **Monorepo:** Nx + pnpm workspaces
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10.13.1 (`corepack enable && corepack prepare pnpm@10.13.1 --activate`)
- Docker Desktop (for PostgreSQL)

### Quick start (macOS / Linux)

```bash
git clone https://github.com/vlad-mihet/transylvania-grand-estate.git
cd transylvania-grand-estate
./scripts/setup-mac.sh
```

`setup-mac.sh` is idempotent and does the whole dance: installs deps, seeds
the gitignored env files from their `.example` templates, starts Postgres,
builds the shared packages, and runs `prisma generate` + `migrate deploy` +
`db seed`. When it finishes, `pnpm dev:all` starts everything. The manual
steps below are what the script automates, for reference or for Windows.

### Install

```bash
git clone https://github.com/vlad-mihet/transylvania-grand-estate.git
cd transylvania-grand-estate
pnpm install
```

### Database

Start PostgreSQL via Docker:

```bash
docker compose up -d
```

This runs Postgres 16 on `localhost:5435` (user: `postgres`, password: `password`, db: `tge_dev`).

The Prisma seed imports from `@tge/data`, and the API loads `@tge/locale`,
`@tge/types`, and `@tge/data` as compiled JS at runtime — build them once
before generating/seeding:

```bash
pnpm --filter @tge/locale build
pnpm --filter @tge/types build
pnpm --filter @tge/data build

pnpm --filter @tge/api exec prisma generate
pnpm --filter @tge/api exec prisma migrate deploy
pnpm --filter @tge/api exec prisma db seed    # seeds initial data
```

### Environment Variables

Copy each app's `.example` to its gitignored counterpart (the quick-start
script does this for you). The API runs on **port 4000** in dev.

```bash
cp apps/api/.env.example       apps/api/.env
cp apps/admin/.env.example     apps/admin/.env          # admin reads .env, not .env.local
cp apps/landing/.env.example   apps/landing/.env.local
cp apps/academy/.env.local.example apps/academy/.env.local
# revery needs no env file — it defaults its API URL in next.config.ts
```

The committed defaults point every app at `http://localhost:4000/api/v1` and
ship safe dev placeholders for the JWT/invitation secrets. Leave
`RESEND_API_KEY` / `GOOGLE_CLIENT_ID` blank for local dev (emails log to
stdout, the Google button is hidden). The `apps/api/.env.example` notes which
vars are Windows-only (`PRISMA_CLIENT_ENGINE_TYPE`) — leave those unset on
macOS/Linux.

### Development

```bash
# All apps at once
pnpm dev:all

# Individual apps
pnpm dev          # Landing  (port 3050)
pnpm dev:api      # API      (port 4000)
pnpm dev:admin    # Admin    (port 3051)
pnpm dev:academy  # Academy  (port 3053)
pnpm --filter @tge/revery dev   # Revery (port 3052)
```

### Build

```bash
pnpm build          # Landing
pnpm build:api      # API
pnpm build:admin    # Admin
pnpm build:all      # All apps
```

### Lint

```bash
pnpm lint           # Landing
pnpm lint:all       # All apps
```

### Prisma Helpers

```bash
cd apps/api
npx prisma studio       # Visual DB browser
npx prisma migrate dev  # Create/apply migrations
npx prisma db seed      # Seed database
```

## Documentation

For detailed guides beyond setup:

- [Architecture Overview](docs/ARCHITECTURE.md) — System design, data flow, and conventions
- [Authentication](docs/AUTH.md) — JWT auth flow, roles, and how the admin BFF proxy works
- [Admin Guide](docs/ADMIN-GUIDE.md) — CRUD patterns, forms, and adding new entities
- [Landing Guide](docs/LANDING-GUIDE.md) — Server-side data fetching, templates, and i18n
- **API Reference** — Run the API and visit `http://localhost:4000/api/docs` (Swagger)

## Production

See `.env.production.example` at the project root for all required production variables (R2 storage, JWT secrets, CORS, etc.).

Generate JWT secrets with:

```bash
openssl rand -base64 48
```

Deploy with Docker:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This builds and runs the API (port 3333) and Admin (port 3001) containers alongside PostgreSQL.

### Build pipeline notes

- **`@tge/types` and `@tge/data` are built packages.** Their `package.json` `exports.node` points at `dist/`, so the API (which runs on Node) loads compiled JS at runtime — Next.js apps consume TS source via `transpilePackages` and aren't affected. To keep dist in sync with src during local development, `apps/api`'s `dev` script uses `concurrently` to run `tsc -w` watchers for both packages alongside `nest start --watch`. Edits to `packages/types/src/**` or `packages/data/src/**` rebuild dist within ~2s and Nest restarts automatically. If you bypass `pnpm --filter @tge/api dev` (e.g. running `nest start` directly), build the packages first: `pnpm --filter @tge/types build && pnpm --filter @tge/data build`. The API's `prebuild` script does this for production builds.
- **API dist entrypoint:** `dist/apps/api/src/main.js` (not `dist/main.js`). The API's `tsconfig.build.json` uses `rootDir: "../.."` so shared workspace packages can be compiled alongside the app sources.
- **Brand routing:** each Next app must set `NEXT_PUBLIC_SITE_ID` (`TGE_LUXURY` / `REVERY` / `ADMIN`) in its `next.config.ts`. The shared `@tge/api-client` stamps every request with an `X-Site` header which the API's `SiteMiddleware` uses to pin tier scope — misconfigured apps silently get zero property results.
- **CORS required origins:** `CORS_ORIGINS` must be explicit in production (comma-separated). The boot fails fast on an empty or whitespace-only value.

## Adding shadcn/ui Components

From the landing app directory:

```bash
cd apps/landing
npx shadcn@latest add <component>
```

Components are installed into `packages/ui/src/components/ui/` via the alias config in `components.json`.
