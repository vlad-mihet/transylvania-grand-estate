import { SetMetadata } from '@nestjs/common';
import type { AuthRealm } from '../auth/realm';

/**
 * Restrict a route (or controller) to tokens issued by a specific realm.
 * Admin-surface controllers should declare `@Realm('admin')` so academy
 * tokens can't traverse admin endpoints, and vice versa.
 *
 * Composes with `JwtAuthGuard` (which populates `req.user`) and `RealmGuard`
 * (which reads this metadata and enforces the match). Routes marked
 * `@Public()` skip realm enforcement.
 */
export const REALM_KEY = 'auth:realm';
export const Realm = (realm: AuthRealm) => SetMetadata(REALM_KEY, realm);
