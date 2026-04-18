# Transylvania Grand Estate

Luxury real estate consultancy platform — an Nx monorepo powered by Next.js, NestJS, and TypeScript.

## Project Structure

```
apps/
  landing/          Public website (Next.js 16, App Router) — port 3000
  admin/            Admin panel (Next.js 16, App Router) — port 3001
  api/              REST API (NestJS, Prisma ORM) — port 3333

packages/
  types/            Shared TypeScript type definitions (@tge/types)
  data/             Static data — properties, developers, cities, etc. (@tge/data)
  utils/            Utility functions — cn(), formatPrice(), formatArea() (@tge/utils)
  hooks/            React hooks — useIntersectionObserver, useScrollDirection (@tge/hooks)
  ui/               shadcn/ui primitives + shared components (@tge/ui)
  i18n/             Shared i18n routing & navigation config (@tge/i18n)
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
- pnpm 10+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker (for PostgreSQL)

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

This runs Postgres 16 on `localhost:5432` (user: `postgres`, password: `password`, db: `tge_dev`).

Then run migrations and generate the Prisma client:

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
npx prisma db seed    # optional — seeds initial data
cd ../..
```

### Environment Variables

Create the following files before running the apps:

**`apps/api/.env`** (copy from `apps/api/.env.example`):

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/tge_dev?schema=public"
JWT_ACCESS_SECRET="dev-access-secret-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"
PORT=3333
NODE_ENV=development
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
```

**`apps/admin/.env.local`**:

```env
NEXT_PUBLIC_API_URL=http://localhost:3333/api/v1
API_URL=http://localhost:3333/api/v1
```

**`apps/landing/.env.local`**:

```env
NEXT_PUBLIC_API_URL=http://localhost:3333/api/v1
```

### Development

```bash
# All apps at once
pnpm dev:all

# Individual apps
pnpm dev          # Landing (port 3000)
pnpm dev:api      # API (port 3333)
pnpm dev:admin    # Admin (port 3001)
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
- **API Reference** — Run the API and visit `http://localhost:3333/api/docs` (Swagger)

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

- **`@tge/types` is a built package.** `pnpm --filter @tge/types build` must run before `pnpm --filter @tge/api build`; the API Dockerfile handles this. At runtime, Node resolves `@tge/types/*` via the package's `node` conditional export (pointing at `dist/`) — Next.js apps still consume the TS source via `transpilePackages`.
- **API dist entrypoint:** `dist/apps/api/src/main.js` (not `dist/main.js`). The API's `tsconfig.build.json` uses `rootDir: "../.."` so shared workspace packages can be compiled alongside the app sources.
- **Brand routing:** each Next app must set `NEXT_PUBLIC_SITE_ID` (`TGE_LUXURY` / `REVERIA` / `ADMIN`) in its `next.config.ts`. The shared `@tge/api-client` stamps every request with an `X-Site` header which the API's `SiteMiddleware` uses to pin tier scope — misconfigured apps silently get zero property results.
- **CORS required origins:** `CORS_ORIGINS` must be explicit in production (comma-separated). The boot fails fast on an empty or whitespace-only value.

## Adding shadcn/ui Components

From the landing app directory:

```bash
cd apps/landing
npx shadcn@latest add <component>
```

Components are installed into `packages/ui/src/components/ui/` via the alias config in `components.json`.
