import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from './test-app.factory';
import { unwrap } from './fixtures';
import * as bcrypt from 'bcrypt';
import { AdminRole } from '@prisma/client';

// Local email — `ADMIN_EMAIL` (`super@test`) from fixtures.ts isn't a
// fully-qualified email, so LoginDto's class-validator rejects it on the way
// in. Other specs sidestep this by signing JWTs directly via JwtService;
// this one needs a real /auth/login round-trip to mint a refresh token with
// the rotation jti claim, so the email must pass validation.
const ADMIN_EMAIL = 'super-rt@test.local';

/**
 * Phase-1 third-pass fix #2: refresh-token rotation must be single-use. The
 * `/auth/refresh` handler revokes the previous jti before issuing the new
 * pair, so a stolen-and-replayed token can be used at most once. Logout
 * additionally revokes the current jti via the denylist (`RevokedToken`).
 *
 * If a future refactor drops the revoke-before-issue, RT1 replays would
 * silently succeed — turning a 7-day-window vulnerability back on.
 */
describe('Auth — refresh-token single-use rotation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const PASSWORD = 'SuperSecretPass123';

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    // Seed a SUPER_ADMIN with a known password so /auth/login mints a real
    // refresh token. We avoid the shortcut JwtService.sign because the
    // tokens used here must contain the real jti claim that the rotation
    // logic depends on.
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    await prisma.adminUser.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        name: 'Super Admin',
        role: AdminRole.SUPER_ADMIN,
      },
    });
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function login(): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Site', 'ADMIN')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });
    if (res.status !== 201) {
      throw new Error(
        `login expected 201, got ${res.status}: ${JSON.stringify(res.body)}`,
      );
    }
    return unwrap(res);
  }

  async function refresh(rt: string) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('X-Site', 'ADMIN')
      .send({ refreshToken: rt });
  }

  it('RT1 → refresh OK, RT1 replay → 401 (revoked)', async () => {
    const { refreshToken: rt1 } = await login();

    const first = await refresh(rt1);
    expect(first.status).toBe(201);
    const tokens = unwrap<{ refreshToken: string }>(first);
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.refreshToken).not.toBe(rt1);

    const replay = await refresh(rt1);
    expect(replay.status).toBe(401);
  });

  it('RT2 (returned by first refresh) → refresh OK', async () => {
    const { refreshToken: rt1 } = await login();
    const first = await refresh(rt1);
    const rt2 = unwrap<{ refreshToken: string }>(first).refreshToken;

    const second = await refresh(rt2);
    expect(second.status).toBe(201);
    const rt3 = unwrap<{ refreshToken: string }>(second).refreshToken;
    expect(rt3).not.toBe(rt2);
  });

  it('logout(RT) revokes that jti — subsequent refresh → 401', async () => {
    const { refreshToken: rt1 } = await login();

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('X-Site', 'ADMIN')
      .send({ refreshToken: rt1 })
      .expect(201);

    const replay = await refresh(rt1);
    expect(replay.status).toBe(401);

    // Sanity: the denylist row exists for this jti.
    const revoked = await prisma.revokedToken.count();
    expect(revoked).toBeGreaterThan(0);
  });

  it('rotation chain ends at logout — RT3 revoked after logging it out', async () => {
    const { refreshToken: rt1 } = await login();
    const rt2 = unwrap<{ refreshToken: string }>(await refresh(rt1)).refreshToken;
    const rt3 = unwrap<{ refreshToken: string }>(await refresh(rt2)).refreshToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('X-Site', 'ADMIN')
      .send({ refreshToken: rt3 })
      .expect(201);

    const replay = await refresh(rt3);
    expect(replay.status).toBe(401);
  });
});
