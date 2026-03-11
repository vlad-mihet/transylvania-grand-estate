# Architecture Overview

## System Diagram

```
                    ┌──────────────────┐
                    │   PostgreSQL 16   │
                    │   (port 5432)     │
                    └────────▲─────────┘
                             │ Prisma ORM
                             │
┌──────────────┐    ┌────────┴─────────┐    ┌──────────────┐
│   Landing    │───▶│       API        │◀───│    Admin      │
│  Next.js 16  │    │    NestJS 11     │    │  Next.js 16   │
│  port 3000   │    │    port 3333     │    │  port 3001    │
│              │    │                  │    │               │
│  SSR / ISR   │    │  /api/v1/*       │    │  Client-side  │
│  read-only   │    │  Swagger: /api/docs  │  React Query  │
└──────────────┘    └────────┬─────────┘    └──────────────┘
                             │
                    ┌────────▼─────────┐
                    │     Storage      │
                    │  Local / R2      │
                    └──────────────────┘
```

- **Landing** fetches data from the API using server components (no auth, read-only)
- **Admin** fetches from the API using client-side React Query with JWT auth
- **Admin** has a BFF proxy layer (`/api/auth/*` route handlers) for secure cookie management — see [AUTH.md](./AUTH.md)

## App Responsibilities

**Landing** (`apps/landing/`) — The public-facing website. Server-rendered with Next.js App Router. Fetches data via `fetchApi()` with ISR (60-second revalidation). No authentication. Supports English and Romanian via `next-intl`. Has a developer template system for custom-styled developer pages.

**API** (`apps/api/`) — NestJS REST backend prefixed at `/api/v1`. All endpoints are JWT-protected by default — use `@Public()` to opt out for landing-facing reads. Handles CRUD for all entities, file uploads, and auth. Swagger docs at `/api/docs`.

**Admin** (`apps/admin/`) — Client-rendered dashboard for managing content. Uses React Query for data fetching, React Hook Form + Zod for forms, and a dual-JWT auth system with silent token refresh. Runs on port 3001.

## Shared Packages

| Package | Purpose | Used by |
|---------|---------|---------|
| `@tge/types` | TypeScript interfaces (`Property`, `Developer`, `City`, `Testimonial`, `LocalizedString`) | Landing, Admin, API |
| `@tge/data` | Static seed data and helper functions (`getPropertyBySlug`, `getFeaturedDevelopers`, etc.) | API (seeding) |
| `@tge/utils` | `cn()`, `formatPrice()`, `formatArea()`, `localize()` | Landing, Admin |
| `@tge/hooks` | React hooks (`useIntersectionObserver`, `useParallax`, `useScrollDirection`) | Landing, Admin |
| `@tge/ui` | shadcn/ui primitives + shared components (`AccentButton`, `AnimatedCounter`, `ScrollReveal`, `SectionHeading`) | Landing, Admin |
| `@tge/i18n` | Routing config, navigation helpers, locale constants (`en`, `ro`) | Landing, Admin |
| `@tge/tailwind-config` | Shared TailwindCSS 4 theme (copper/gold accent palette, serif header fonts) | Landing, Admin |

## API Response Format

Every API response is wrapped by a global `TransformInterceptor`:

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { ... }          // optional — used for pagination
}

// Error (via HttpExceptionFilter)
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Validation failed"
  }
}
```

Both `apiClient()` (admin) and `fetchApi()` (landing) auto-unwrap the `.data` field, so consumers work directly with the payload.

Source: `apps/api/src/common/interceptors/transform.interceptor.ts`, `apps/api/src/common/filters/http-exception.filter.ts`

## Localized Data Convention

Content that appears in both English and Romanian uses a `LocalizedString` pattern:

```typescript
// @tge/types
type LocalizedString = { en: string; ro: string };
```

**Storage:** Prisma stores these as `Json` columns (e.g., `Property.title`, `Property.description`, `City.description`, `Testimonial.quote`).

**Reading:** Use `localize(str, locale)` from `@tge/utils` to resolve a `LocalizedString` to the current locale's value, with English as the fallback.

**Editing:** Admin forms use `BilingualInput` and `BilingualTextarea` components that render EN/RO tabs for each localized field.

**UI strings** (button labels, page titles, etc.) are handled separately by `next-intl` message files in `apps/landing/messages/` and `apps/admin/messages/`.

## Database Overview

The Prisma schema lives at `apps/api/prisma/schema.prisma`. Key entities:

| Entity | Notes |
|--------|-------|
| `AdminUser` | Roles: `SUPER_ADMIN`, `ADMIN`, `EDITOR`. Password stored as bcrypt hash. |
| `Property` | Core listing. `features` is a `Json` column containing `LocalizedString[]`. Has many `PropertyImage`. |
| `PropertyImage` | `src` stores a relative path (local) or full URL (R2). `isHero` marks the hero image. `sortOrder` controls gallery order. |
| `Developer` | One-to-many with `Property` via `developerId`. |
| `City` | Referenced by `citySlug` string on `Property` (not a foreign key). |
| `Testimonial` | Client reviews. `quote` is a `LocalizedString`. |
| `Inquiry` | Contact form submissions. Types: `general`, `property`, `developer`. Statuses: `new`, `read`, `archived`. |
| `SiteConfig` | **Singleton** — `id` is always `"singleton"`. Stores site name, tagline, contact info, social links. |

The seed script (`apps/api/prisma/seed.ts`) creates a default admin user (`admin@tge.ro` / `admin123!`), plus sample developers, cities, properties, and testimonials from `@tge/data`.

## File Storage

File uploads go through a `StorageService` interface with two implementations:

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Local** | `STORAGE_TYPE` unset or not `r2` | Saves to `UPLOAD_DIR` (default `./uploads`). API serves files via `ServeStaticModule` at `/uploads/*`. |
| **R2** | `STORAGE_TYPE=r2` | Uploads to Cloudflare R2 bucket. Returns full public URL via `R2_PUBLIC_URL`. |

Upload constraints: max 10 files per request, 10MB each, formats: `jpg`, `jpeg`, `png`, `webp`, `avif`.

Source: `apps/api/src/uploads/uploads.service.ts`, `apps/api/src/uploads/storage/`

## CI/CD

GitHub Actions workflow at `.github/workflows/deploy-fly.yml`:

- **Trigger:** Push to `main` that touches `apps/api/`, `apps/admin/`, or `packages/`
- **Jobs:** `deploy-api` and `deploy-admin` run in parallel on Fly.io
- **Secret:** `FLY_API_TOKEN` stored in GitHub repository secrets
- **Landing** is not in the workflow — it's deployed separately

Each app has its own `fly.toml` at `apps/<app>/fly.toml`.

## Key Commands

| Command | What it does |
|---------|-------------|
| `pnpm dev:all` | Start all 3 apps in dev mode |
| `pnpm dev` | Landing only (port 3000) |
| `pnpm dev:api` | API only (port 3333) |
| `pnpm dev:admin` | Admin only (port 3001) |
| `pnpm build:all` | Production build all apps |
| `docker compose up -d` | Start local PostgreSQL |
| `cd apps/api && npx prisma studio` | Visual database browser |
| `cd apps/api && npx prisma migrate dev` | Create and apply migrations |
| `cd apps/api && npx prisma db seed` | Seed database with sample data |
| `cd apps/landing && npx shadcn@latest add <component>` | Add shadcn/ui component to `packages/ui/` |
