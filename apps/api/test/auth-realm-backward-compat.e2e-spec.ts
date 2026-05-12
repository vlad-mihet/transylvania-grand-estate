import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AdminRole, PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createTestApp } from './test-app.factory';
import { bearer } from './fixtures';

/**
 * Phase 2 — Stage 2.0a (Prep-3) backward-compat contract.
 *
 * The `realm.ts` module promises that admin tokens minted before the
 * realm claim was added still authenticate — `JwtAccessStrategy`
 * coalesces `payload.realm ?? 'admin'`. This spec pins the contract
 * so a future refactor that drops the legacy fallback breaks loudly
 * here instead of silently in production where 15-minute access
 * tokens minted seconds before deploy would 401 mid-session.
 *
 * Three cases exercised against `GET /auth/me`:
 *   1. Token with `realm: 'admin'` — current production minting
 *   2. Token with no realm claim — legacy pre-realm minting
 *   3. Token with `realm: 'academy'` (signed by admin secret) — must
 *      be rejected; otherwise an academy-realm token could authenticate
 *      against admin endpoints
 */
describe('Auth realm backward compatibility (e2e)', () => {
  const ENDPOINT = '/api/v1/auth/me';

  let app: INestApplication;
  let prisma: PrismaClient;
  let userId: string;
  let userEmail: string;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    const passwordHash = await bcrypt.hash('ignored', 4);
    const user = await prisma.adminUser.create({
      data: {
        email: 'realm-compat@test',
        passwordHash,
        name: 'Realm Compat',
        role: AdminRole.SUPER_ADMIN,
      },
    });
    userId = user.id;
    userEmail = user.email;
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  function mintAdminToken(payloadOverrides: Record<string, unknown>): string {
    const jwt = app.get(JwtService);
    return jwt.sign(
      {
        sub: userId,
        email: userEmail,
        role: AdminRole.SUPER_ADMIN,
        agentId: null,
        ...payloadOverrides,
      },
      { secret: process.env.JWT_ADMIN_ACCESS_SECRET, expiresIn: '15m' },
    );
  }

  it('accepts a token with realm: "admin" (current production minting)', async () => {
    const token = mintAdminToken({ realm: 'admin' });
    const res = await request(app.getHttpServer())
      .get(ENDPOINT)
      .set(bearer(token))
      .set('X-Site', 'ADMIN');
    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body.id).toBe(userId);
    expect(body.email).toBe(userEmail);
  });

  it('accepts a legacy token with no realm claim (backward compat)', async () => {
    // Sign without overriding `realm` — the field is absent from the
    // payload, mirroring tokens minted before Stage 2.0a's realm.ts
    // re-export landed.
    const token = mintAdminToken({});
    const res = await request(app.getHttpServer())
      .get(ENDPOINT)
      .set(bearer(token))
      .set('X-Site', 'ADMIN');
    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body.id).toBe(userId);
    expect(body.email).toBe(userEmail);
  });

  it('rejects a token claiming realm: "academy" (signed with admin secret)', async () => {
    // Realm claim mismatch: payload says "academy" but the token is
    // signed with the admin secret + carries an admin-shaped payload.
    // JwtAccessStrategy must reject this so an attacker who learns the
    // admin secret can't forge an academy-claimed token to bypass
    // realm-scoped checks downstream. Defense-in-depth on top of the
    // separate-secrets boundary.
    const token = mintAdminToken({ realm: 'academy' });
    const res = await request(app.getHttpServer())
      .get(ENDPOINT)
      .set(bearer(token))
      .set('X-Site', 'ADMIN');
    expect(res.status).toBe(401);
  });
});
