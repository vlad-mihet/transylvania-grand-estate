import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTestApp, MockEmailService } from './test-app.factory';
import { bearer, unwrap } from './fixtures';

/**
 * End-to-end coverage for the self-service registration flow:
 *   1. Happy path — register → verify → tokens issued → empty dashboard →
 *      auto-enroll on first public lesson read lands the course on the
 *      dashboard. No wildcard is created on verify-email; the visibility
 *      gate is now meaningful for self-service accounts.
 *   2. Duplicate email — the second /register call on the same address
 *      returns 202 without minting a second AcademyUser row; the
 *      verification token is rotated so the stale link can't land access.
 *   3. Expired token — verify with a token whose expiresAt has passed
 *      returns 410 Gone.
 *   4. Already-used token — consuming a token twice yields 410 on the
 *      second attempt (atomic updateMany guard).
 *   5. Resend — anti-enumeration behaviour: unknown email + already-
 *      verified email both return 202 with no email sent.
 */
describe('Academy registration (e2e)', () => {
  let app: INestApplication;
  let mockEmail: MockEmailService;
  let prisma: PrismaClient;

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

  async function seedPublishedCourse() {
    const course = await prisma.course.create({
      data: {
        slug: 'fundamentals',
        title: { ro: 'Fundamentele', en: 'Fundamentals' },
        description: { ro: 'Curs intro', en: 'Intro course' },
        status: 'published',
        // Public so a self-service user (who no longer gets a wildcard on
        // verify-email) can actually read the lesson end-to-end in the
        // happy-path test.
        visibility: 'public',
        order: 10,
        publishedAt: new Date(),
      },
    });
    const lesson = await prisma.lesson.create({
      data: {
        courseId: course.id,
        slug: 'lesson-one',
        order: 10,
        title: { ro: 'Lecția 1', en: 'Lesson 1' },
        excerpt: { ro: 'Intro', en: 'Intro' },
        content: { ro: 'Conținut markdown', en: 'Markdown content' },
        type: 'text',
        status: 'published',
        publishedAt: new Date(),
      },
    });
    return { course, lesson };
  }

  describe('happy path', () => {
    it('register → verify → empty dashboard → lesson read auto-enrolls into the public course', async () => {
      const { course, lesson } = await seedPublishedCourse();

      // 1. Register.
      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/register')
        .send({
          name: 'Test Student',
          email: 'student@example.com',
          password: 'Str0ngPassword!!',
          locale: 'ro',
        })
        .expect(201);

      const verificationEmail = mockEmail.captured.find(
        (c) => c.template === 'academy-verification',
      );
      expect(verificationEmail).toBeDefined();
      const plaintextToken = extractToken(verificationEmail!.url!);

      // AcademyUser is created but not yet verified.
      const preVerify = await prisma.academyUser.findUnique({
        where: { email: 'student@example.com' },
      });
      expect(preVerify).toBeDefined();
      expect(preVerify!.emailVerifiedAt).toBeNull();

      // 2. Verify — sets emailVerifiedAt and returns access tokens, but
      // no enrollment row is created. Self-service signups now start with
      // an empty dashboard; engagement populates it.
      const verified = await request(app.getHttpServer())
        .post('/api/v1/academy/auth/verify-email')
        .send({ token: plaintextToken })
        .expect(201);
      const body = unwrap<{ accessToken: string; refreshToken: string }>(
        verified,
      );
      expect(body.accessToken).toBeTruthy();

      const postVerify = await prisma.academyUser.findUnique({
        where: { email: 'student@example.com' },
      });
      expect(postVerify!.emailVerifiedAt).not.toBeNull();

      const postVerifyEnrollments = await prisma.academyEnrollment.findMany({
        where: { userId: postVerify!.id },
      });
      expect(postVerifyEnrollments).toEqual([]);

      // Dashboard is empty immediately after verify.
      const emptyDashboard = await request(app.getHttpServer())
        .get('/api/v1/academy/courses')
        .set(bearer(body.accessToken))
        .expect(200);
      expect(unwrap<unknown[]>(emptyDashboard)).toEqual([]);

      // 3. Lesson read on a public course: succeeds (no enrollment gate)
      // and auto-enrolls the student so the course lands on the dashboard.
      await request(app.getHttpServer())
        .get(`/api/v1/academy/courses/${course.slug}/lessons/${lesson.slug}`)
        .set(bearer(body.accessToken))
        .expect(200);

      const autoEnrollment = await prisma.academyEnrollment.findFirst({
        where: { userId: postVerify!.id, revokedAt: null },
      });
      expect(autoEnrollment).not.toBeNull();
      expect(autoEnrollment!.courseId).toBe(course.id);
      expect(autoEnrollment!.grantedById).toBeNull();

      const dashboard = await request(app.getHttpServer())
        .get('/api/v1/academy/courses')
        .set(bearer(body.accessToken))
        .expect(200);
      const slugs = unwrap<Array<{ slug: string }>>(dashboard).map((c) => c.slug);
      expect(slugs).toContain(course.slug);
    });
  });

  describe('duplicate email', () => {
    it('second register rotates the verification token without creating a duplicate user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/register')
        .send({
          name: 'First Try',
          email: 'dup@example.com',
          password: 'Str0ngPassword!!',
        })
        .expect(201);

      const firstTokenRow = await prisma.academyEmailVerificationToken.findFirst(
        { where: { email: 'dup@example.com' } },
      );
      expect(firstTokenRow).toBeDefined();

      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/register')
        .send({
          name: 'Second Try',
          email: 'dup@example.com',
          password: 'An0therStr0ng!!',
        })
        .expect(201);

      // Only one AcademyUser row despite two registrations.
      const userCount = await prisma.academyUser.count({
        where: { email: 'dup@example.com' },
      });
      expect(userCount).toBe(1);

      // Oldest token is now marked used (invalidated); newest token is
      // the one that will actually verify.
      const tokens = await prisma.academyEmailVerificationToken.findMany({
        where: { email: 'dup@example.com' },
        orderBy: { createdAt: 'asc' },
      });
      expect(tokens.length).toBe(2);
      expect(tokens[0].usedAt).not.toBeNull();
      expect(tokens[1].usedAt).toBeNull();

      // Consuming the OLD token returns 410 — atomic invalidation worked.
      const firstPlaintextEmail = mockEmail.captured[0];
      const firstPlaintext = extractToken(firstPlaintextEmail.url!);
      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/verify-email')
        .send({ token: firstPlaintext })
        .expect(410);
    });
  });

  describe('expired token', () => {
    it('returns 410 when expiresAt has passed', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/register')
        .send({
          name: 'Stale Token',
          email: 'stale@example.com',
          password: 'Str0ngPassword!!',
        })
        .expect(201);
      const plaintext = extractToken(mockEmail.captured[0].url!);

      // Backdate the token so expiresAt is in the past.
      await prisma.academyEmailVerificationToken.updateMany({
        where: { email: 'stale@example.com' },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/verify-email')
        .send({ token: plaintext })
        .expect(410);
    });
  });

  describe('already-used token', () => {
    it('returns 410 on second verify attempt with the same token', async () => {
      await seedPublishedCourse();
      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/register')
        .send({
          name: 'Reuse Token',
          email: 'reuse@example.com',
          password: 'Str0ngPassword!!',
        })
        .expect(201);
      const plaintext = extractToken(mockEmail.captured[0].url!);

      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/verify-email')
        .send({ token: plaintext })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/verify-email')
        .send({ token: plaintext })
        .expect(410);
    });
  });

  describe('resend-verification anti-enumeration', () => {
    it('returns 201 for unknown email without sending anything', async () => {
      const beforeCount = mockEmail.captured.length;
      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/resend-verification')
        .send({ email: 'unknown@example.com' })
        .expect(201);
      expect(mockEmail.captured.length).toBe(beforeCount);
    });

    it('returns 201 for already-verified email without sending anything', async () => {
      await seedPublishedCourse();
      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/register')
        .send({
          name: 'Verified',
          email: 'verified@example.com',
          password: 'Str0ngPassword!!',
        })
        .expect(201);
      const plaintext = extractToken(mockEmail.captured[0].url!);
      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/verify-email')
        .send({ token: plaintext })
        .expect(201);

      const beforeCount = mockEmail.captured.length;
      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/resend-verification')
        .send({ email: 'verified@example.com' })
        .expect(201);
      // No additional verification email sent (account already verified).
      const afterCount = mockEmail.captured.length;
      expect(afterCount).toBe(beforeCount);
    });

    it('sends a new verification email for a pending unverified account', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/register')
        .send({
          name: 'Pending',
          email: 'pending@example.com',
          password: 'Str0ngPassword!!',
        })
        .expect(201);

      const beforeCount = mockEmail.captured.length;
      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/resend-verification')
        .send({ email: 'pending@example.com' })
        .expect(201);
      const afterCount = mockEmail.captured.length;
      expect(afterCount).toBe(beforeCount + 1);

      // Most recent captured email is a fresh verification.
      expect(mockEmail.captured[afterCount - 1].template).toBe(
        'academy-verification',
      );
    });
  });
});
