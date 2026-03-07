# Transylvania Grand Estate

Luxury real estate consultancy platform — an Nx monorepo powered by Next.js, React, and TypeScript.

## Project Structure

```
apps/
  landing/          Landing page (Next.js 16, App Router)

packages/
  types/            Shared TypeScript type definitions (@tge/types)
  utils/            Utility functions — cn(), formatPrice(), formatArea() (@tge/utils)
  hooks/            React hooks — useIntersectionObserver, useScrollDirection (@tge/hooks)
  ui/               shadcn/ui primitives + shared components (@tge/ui)
  i18n/             Shared i18n routing & navigation config (@tge/i18n)
  data/             Static data — properties, developers, cities, etc. (@tge/data)
  tailwind-config/  Shared TailwindCSS 4 theme (@tge/tailwind-config)
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5
- **Styling:** TailwindCSS 4, shadcn/ui
- **Internationalization:** next-intl (English & Romanian)
- **Monorepo:** Nx + pnpm workspaces
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+

### Install

```bash
pnpm install
```

### Development

```bash
# Run the landing page dev server
pnpm dev

# Or via Nx directly
npx nx dev landing
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Build

```bash
# Production build
pnpm build

# Build all apps
pnpm build:all
```

### Lint

```bash
pnpm lint
```

## Adding a New App

1. Create a directory under `apps/` (e.g. `apps/admin/`)
2. Add `workspace:*` dependencies on any `@tge/*` packages you need
3. Add a `project.json` for Nx
4. Run `pnpm install`

## Adding shadcn/ui Components

From the landing app directory:

```bash
cd apps/landing
npx shadcn@latest add <component>
```

Components are installed into `packages/ui/src/components/ui/` via the alias config in `components.json`.
