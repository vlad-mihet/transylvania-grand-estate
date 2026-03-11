# Authentication

## Overview

The admin panel uses a **dual JWT strategy**:

- **Access token** — 15-minute expiry, stored in-memory on the client (a module-level variable, not localStorage). Sent as `Authorization: Bearer <token>` on every API request.
- **Refresh token** — 7-day expiry, stored as an `httpOnly` cookie managed by the admin's BFF proxy. Never accessible to client-side JavaScript.

Three admin roles exist: `SUPER_ADMIN`, `ADMIN`, `EDITOR`. The landing site requires no authentication.

## Architecture

```
Browser (Admin)                    Admin Server (Next.js)           API (NestJS)
─────────────────                  ──────────────────────           ────────────

POST /api/auth/login  ──────────▶  BFF route handler  ──────────▶  POST /api/v1/auth/login
                                   Sets httpOnly cookie              Returns { accessToken,
  Receives { accessToken, user }◀──  with refreshToken   ◀──────────  refreshToken, user }

GET /api/v1/properties ─────────────────────────────────────────▶  JWT guard validates
  (Bearer token in header)                                          access token

POST /api/auth/refresh ──────────▶  Reads cookie, sends  ─────────▶  POST /api/v1/auth/refresh
                                   refreshToken in body              Validates & rotates tokens
  Receives new accessToken ◀──────  Sets updated cookie  ◀──────────  Returns new token pair
```

## API Layer

### Global JWT Guard

All API endpoints are protected by default via a global `JwtAuthGuard` registered in `app.module.ts`. It uses the `jwt-access` Passport strategy, which validates the Bearer token from the `Authorization` header.

To make an endpoint public (e.g., for the landing site):

```typescript
import { Public } from '../common/decorators/public.decorator';

@Public()
@Get()
async findAll() { ... }
```

Source: `apps/api/src/common/guards/jwt-auth.guard.ts`, `apps/api/src/common/decorators/public.decorator.ts`

### Role-Based Access

Use `@Roles()` to restrict an endpoint to specific roles. If no `@Roles()` is set, any authenticated user can access it.

```typescript
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from '@prisma/client';

@Roles(AdminRole.SUPER_ADMIN)
@Post('register')
async register(@Body() dto: RegisterDto) { ... }
```

The `RolesGuard` (also global) reads the `roles` metadata and compares against `req.user.role`.

Source: `apps/api/src/common/guards/roles.guard.ts`, `apps/api/src/common/decorators/roles.decorator.ts`

### Auth Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /auth/login` | `@Public()` | Returns `{ accessToken, refreshToken, user }` |
| `POST /auth/refresh` | `jwt-refresh` strategy | Validates refresh token from body, returns new token pair |
| `POST /auth/register` | `SUPER_ADMIN` only | Creates a new admin user |
| `GET /auth/me` | Any authenticated | Returns current user profile |
| `POST /auth/change-password` | Any authenticated | Validates current password, updates to new |

### Passport Strategies

**`jwt-access`** — Extracts token from `Authorization: Bearer <token>` header. Payload contains `{ sub, email, role }`.

**`jwt-refresh`** — Extracts token from the request body field `refreshToken`. Payload contains `{ sub, type: "refresh" }`. Only used by the refresh endpoint.

Source: `apps/api/src/auth/strategies/jwt-access.strategy.ts`, `apps/api/src/auth/strategies/jwt-refresh.strategy.ts`

## Admin BFF Proxy

The admin app has three Next.js route handlers that proxy auth requests. This keeps the refresh token in an `httpOnly` cookie that JavaScript can't read.

### `POST /api/auth/login`

1. Forwards credentials to `POST {API_URL}/auth/login`
2. On success, sets `refreshToken` as an `httpOnly` cookie (7-day maxAge, `secure` in production, `sameSite: lax`)
3. Returns `{ accessToken, user }` to the browser (no refresh token exposed)

### `POST /api/auth/refresh`

1. Reads `refreshToken` from the cookie
2. If missing, returns 401
3. Forwards to `POST {API_URL}/auth/refresh` with the token in the body
4. On success, updates the cookie with the new refresh token and returns `{ accessToken, user }`
5. On failure, deletes the cookie

### `POST /api/auth/logout`

1. Deletes the `refreshToken` cookie
2. Returns `{ success: true }`

Source: `apps/admin/src/app/api/auth/login/route.ts`, `apps/admin/src/app/api/auth/refresh/route.ts`, `apps/admin/src/app/api/auth/logout/route.ts`

## Admin Client-Side

### Token Management (`api-client.ts`)

The access token is stored in a **module-level variable** — not localStorage, not sessionStorage. This means it's lost on page refresh (by design — the `AuthProvider` silently refreshes on mount).

`apiClient<T>(path, options)` handles:
1. Attaches `Bearer` token to every request
2. On 401, attempts a silent refresh via `/api/auth/refresh`
3. If refresh succeeds, retries the original request with the new token
4. If refresh fails, redirects to `/login`
5. Auto-unwraps `response.data` from the API envelope

Source: `apps/admin/src/lib/api-client.ts`

### AuthProvider

Wraps the entire dashboard. On mount, calls `/api/auth/refresh` to restore the session. Exposes `{ user, isLoading, login, logout }` via React context.

Source: `apps/admin/src/components/auth/auth-provider.tsx`

### AuthGuard

Wraps dashboard children. If `isLoading`, shows a spinner. If no `user` after loading, redirects to `/login`. Otherwise renders children.

Source: `apps/admin/src/components/auth/auth-guard.tsx`

### Middleware (`middleware.ts`)

The Next.js middleware runs on every non-API request. For protected pages, it checks for the `refreshToken` cookie. If absent, redirects to `/login`. This is a **fast pre-check** — the real auth happens client-side in `AuthProvider`.

Public pages (currently only `/login`) skip the cookie check.

Source: `apps/admin/src/middleware.ts`

## Login Flow (Step by Step)

1. User submits email + password on the login page
2. `AuthProvider.login()` calls `POST /api/auth/login` (admin BFF)
3. BFF forwards to NestJS `POST /api/v1/auth/login`
4. NestJS validates credentials with bcrypt, generates access + refresh tokens
5. BFF sets refresh token as `httpOnly` cookie, returns access token + user to browser
6. `AuthProvider` stores access token via `setAccessToken()` (in-memory) and sets `user` state
7. `AuthGuard` sees the user, renders the dashboard

## Adding a New Protected Endpoint

1. Create your controller method — it's protected by default (no decorator needed)
2. To restrict to specific roles, add `@Roles(AdminRole.SUPER_ADMIN)` (or `ADMIN`, `EDITOR`)
3. To make it public (landing-facing), add `@Public()`
4. Access the current user via `@Request() req` — user object has `{ id, email, role }`
