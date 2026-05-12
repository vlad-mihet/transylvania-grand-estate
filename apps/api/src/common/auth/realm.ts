/**
 * Which product surface issued (and may consume) a JWT. Separates the admin
 * user pool (`AdminUser`) from the academy student pool (`AcademyUser`) so
 * an admin-realm token cannot authenticate against academy endpoints and
 * vice versa. The claim lives on the access token; refresh tokens carry
 * only `sub + type=refresh + jti` and are re-associated to the realm by
 * the consuming strategy.
 *
 * Legacy admin tokens minted before this rollout carry no realm claim; the
 * JWT access strategy defaults those to `'admin'` so existing sessions keep
 * working across deploy.
 *
 * Phase 2 — Stage 2.0a (2026-05-11) added the `Realm` enum to the Prisma
 * schema with a `realm` column on both `admin_users` and `academy_users`.
 * Re-exported below so application code can import the enum value (for
 * Prisma writes/queries) and the existing `AuthRealm` string union (for
 * type annotations) from a single module — both refer to the same domain.
 */
import { Realm } from '@prisma/client';

export { Realm };

export type AuthRealm = `${Realm}`;

export const ADMIN_REALM: AuthRealm = Realm.admin;
export const ACADEMY_REALM: AuthRealm = Realm.academy;
