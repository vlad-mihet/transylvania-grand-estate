import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createTestApp, MockEmailService } from './test-app.factory';

describe('Password reset (e2e)', () => {
  let app: INestApplication;
  let mockEmail: MockEmailService;
  let prisma: PrismaClient;

  async function seedUser(
    email: string,
    opts: { password?: string; ssoOnly?: boolean } = {},
  ): Promise<string> {
    const passwordHash = opts.ssoOnly
      ? null
      : await bcrypt.hash(opts.password ?? 'OldPassword12345', 4);
    const user = await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name: 'Test User',
        role: AdminRole.AGENT,
      },
    });
    return user.id;
  }

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    mockEmail = created.mockEmail;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  function extractToken(url: string): string {
    return new URL(url).searchParams.get('token')!;
  }

  it('forgot \u2192 reset \u2192 login with new password', async () => {
    await seedUser('user@test');
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'user@test' })
      .expect(201);
    const captured = mockEmail.captured.find(
      (c) => c.template === 'password-reset',
    );
    expect(captured).toBeDefined();
    const token = extractToken(captured!.url!);

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'BrandNewPass456789' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@test', password: 'BrandNewPass456789' })
      .expect(201);
  });

  it('SSO-only user \u2192 no email, always 201', async () => {
    await seedUser('sso@test', { ssoOnly: true });
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'sso@test' })
      .expect(201);
    expect(
      mockEmail.captured.filter((c) => c.template === 'password-reset'),
    ).toHaveLength(0);
  });

  it('unknown email \u2192 no email, always 201 (no enumeration)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'ghost@test' })
      .expect(201);
    expect(mockEmail.captured).toHaveLength(0);
  });

  it('requesting again invalidates the earlier token', async () => {
    await seedUser('user@test');
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'user@test' });
    const firstToken = extractToken(mockEmail.captured[0].url!);

    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'user@test' });
    const secondToken = extractToken(mockEmail.captured[1].url!);

    // Second overrides first.
    await request(app.getHttpServer())
      .get(`/api/v1/auth/reset-password/verify?token=${firstToken}`)
      .expect(410);
    await request(app.getHttpServer())
      .get(`/api/v1/auth/reset-password/verify?token=${secondToken}`)
      .expect(200);
  });
});
