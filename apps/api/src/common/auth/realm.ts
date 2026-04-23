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
 */
export type AuthRealm = 'admin' | 'academy';

export const ADMIN_REALM: AuthRealm = 'admin';
export const ACADEMY_REALM: AuthRealm = 'academy';
