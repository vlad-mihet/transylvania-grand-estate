import './per-test-reset';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { createTestApp, MockEmailService } from './test-app.factory';
import {
  bearer,
  seedSuperAdminAndAccessToken,
  unwrap,
} from './fixtures';

/**
 * End-to-end coverage for the academy surface:
 *   1. Happy path — admin invites a student, student accepts via password,
 *      student reads a lesson.
 *   2. Realm leakage — admin JWT must not unlock academy routes (and vice
 *      versa), even when role + enrollment would otherwise be satisfied.
 *   3. Revoke-mid-flight — the EnrolledGuard hits the DB on every request,
 *      so revoking an enrollment fails the next lesson read with no TTL
 *      wait needed.
 */
describe('Academy (e2e)', () => {
  let app: INestApplication;
  let mockEmail: MockEmailService;
  let prisma: PrismaClient;
  let admin: { userId: string; accessToken: string };

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    mockEmail = created.mockEmail;
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    admin = await seedSuperAdminAndAccessToken(app, prisma);
  });

  afterEach(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  function extractToken(url: string): string {
    const u = new URL(url);
    return u.searchParams.get('token')!;
  }

  async function seedCourseWithLesson() {
    const course = await prisma.course.create({
      data: {
        slug: 'fundamentals',
        title: { ro: 'Fundamentele', en: 'Fundamentals' },
        description: { ro: 'Curs intro', en: 'Intro course' },
        status: 'published',
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

  // ── 1. Happy path ────────────────────────────────────────────────────

  describe('happy path', () => {
    it('admin invites a student, student accepts, student reads the lesson', async () => {
      const { course, lesson } = await seedCourseWithLesson();

      // Admin issues an invitation with wildcard enrollment (courseId null).
      const invite = await request(app.getHttpServer())
        .post('/api/v1/admin/academy/invitations')
        .set(bearer(admin.accessToken))
        .send({
          email: 'student@example.com',
          name: 'Test Student',
          locale: 'ro',
          initialCourseId: null,
        })
        .expect(201);
      expect(invite.body.data.emailDelivered).toBe(true);

      // Mock email captured the plaintext accept URL.
      const academyInvite = mockEmail.captured.find(
        (c) => c.template === 'academy-invitation',
      );
      expect(academyInvite).toBeDefined();
      const plaintextToken = extractToken(academyInvite!.url!);

      // Student accepts via password — returns tokens.
      const accepted = await request(app.getHttpServer())
        .post('/api/v1/academy/auth/invitations/accept-password')
        .send({ token: plaintextToken, password: 'Str0ngPassword!!' })
        .expect(201);
      const studentAccessToken: string = accepted.body.data.accessToken;
      expect(studentAccessToken).toBeTruthy();

      // /me returns the academy student profile.
      const meRes = await request(app.getHttpServer())
        .get('/api/v1/academy/auth/me')
        .set(bearer(studentAccessToken))
        .expect(200);
      expect(unwrap<{ email: string }>(meRes).email).toBe('student@example.com');

      // GET /academy/courses lists the seeded course (wildcard enrollment).
      const coursesRes = await request(app.getHttpServer())
        .get('/api/v1/academy/courses')
        .set(bearer(studentAccessToken))
        .expect(200);
      const courses = unwrap<Array<{ slug: string }>>(coursesRes);
      expect(courses.map((c) => c.slug)).toContain(course.slug);

      // GET lesson detail — returns the Romanian content via fallback.
      const lessonRes = await request(app.getHttpServer())
        .get(
          `/api/v1/academy/courses/${course.slug}/lessons/${lesson.slug}`,
        )
        .set(bearer(studentAccessToken))
        .expect(200);
      const body = unwrap<{
        content: string;
        servedLocale: string;
        readingTimeMinutes: number | null;
        videoDurationSeconds: number | null;
      }>(lessonRes);
      expect(body.content).toContain('Conținut markdown');
      expect(body.servedLocale).toBe('ro');
      // Text lessons: reading time computed server-side from content;
      // videoDurationSeconds stays null.
      expect(body.readingTimeMinutes).toBeGreaterThanOrEqual(1);
      expect(body.videoDurationSeconds).toBeNull();
    });
  });

  // ── 2. Realm leakage ────────────────────────────────────────────────

  describe('realm leakage', () => {
    async function mintAcademyAccessToken(userId: string): Promise<string> {
      const jwt = app.get(JwtService);
      return jwt.sign(
        {
          sub: userId,
          email: 'student@example.com',
          name: 'Test Student',
          realm: 'academy',
        },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: '15m',
        },
      );
    }

    it('admin token is rejected on /academy/auth/me and student course routes', async () => {
      await seedCourseWithLesson();

      // /academy/auth/me — admin token (realm='admin') must 401 against
      // the academy strategy.
      await request(app.getHttpServer())
        .get('/api/v1/academy/auth/me')
        .set(bearer(admin.accessToken))
        .expect(401);

      // Student course list also rejects admin tokens.
      await request(app.getHttpServer())
        .get('/api/v1/academy/courses')
        .set(bearer(admin.accessToken))
        .expect(401);
    });

    it('academy token is rejected on admin academy routes', async () => {
      const { course } = await seedCourseWithLesson();
      const academyUser = await prisma.academyUser.create({
        data: {
          email: 'student@example.com',
          passwordHash: null,
          name: 'Test Student',
        },
      });
      const academyToken = await mintAcademyAccessToken(academyUser.id);

      // Admin CRUD routes must reject an academy-realm JWT.
      await request(app.getHttpServer())
        .get('/api/v1/admin/academy/courses')
        .set(bearer(academyToken))
        .expect(401);

      // Even targeted by id.
      await request(app.getHttpServer())
        .get(`/api/v1/admin/academy/courses/${course.id}`)
        .set(bearer(academyToken))
        .expect(401);

      // Top-level admin auth routes too.
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set(bearer(academyToken))
        .expect(401);
    });
  });

  // ── 3. Revoke-mid-flight ────────────────────────────────────────────

  describe('revoke mid-flight', () => {
    it('next lesson read returns 403 NOT_ENROLLED after enrollment is revoked', async () => {
      const { course, lesson } = await seedCourseWithLesson();

      // Invite + accept to produce a student with an active wildcard
      // enrollment (and an access token we can use).
      await request(app.getHttpServer())
        .post('/api/v1/admin/academy/invitations')
        .set(bearer(admin.accessToken))
        .send({
          email: 'student@example.com',
          name: 'Test Student',
          locale: 'ro',
          initialCourseId: null,
        })
        .expect(201);
      const academyInvite = mockEmail.captured.find(
        (c) => c.template === 'academy-invitation',
      );
      const plaintextToken = extractToken(academyInvite!.url!);
      const accepted = await request(app.getHttpServer())
        .post('/api/v1/academy/auth/invitations/accept-password')
        .send({ token: plaintextToken, password: 'Str0ngPassword!!' })
        .expect(201);
      const studentAccessToken: string = accepted.body.data.accessToken;

      // First read succeeds.
      await request(app.getHttpServer())
        .get(`/api/v1/academy/courses/${course.slug}/lessons/${lesson.slug}`)
        .set(bearer(studentAccessToken))
        .expect(200);

      // Revoke by deleting the only enrollment row.
      const enrollments = await prisma.academyEnrollment.findMany();
      expect(enrollments).toHaveLength(1);
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/academy/enrollments/${enrollments[0].id}`)
        .set(bearer(admin.accessToken))
        .expect(200);

      // Next read — same access token, still within its 15-minute TTL —
      // must 403 because the EnrolledGuard hits the DB per request.
      await request(app.getHttpServer())
        .get(`/api/v1/academy/courses/${course.slug}/lessons/${lesson.slug}`)
        .set(bearer(studentAccessToken))
        .expect(403);
    });
  });

  // ── 4. Video lessons ────────────────────────────────────────────────

  describe('video lessons', () => {
    const YT_ID = 'dQw4w9WgXcQ';
    const canonicalYt = `https://www.youtube-nocookie.com/embed/${YT_ID}`;

    async function seedPublishedCourse() {
      return prisma.course.create({
        data: {
          slug: 'fundamentals',
          title: { ro: 'Fundamentele', en: 'Fundamentals' },
          description: { ro: 'Curs intro', en: 'Intro course' },
          status: 'published',
          order: 10,
          publishedAt: new Date(),
        },
      });
    }

    it('admin creates a video lesson with a share URL → stored as canonical embed', async () => {
      const course = await seedPublishedCourse();

      const create = await request(app.getHttpServer())
        .post(`/api/v1/admin/academy/courses/${course.id}/lessons`)
        .set(bearer(admin.accessToken))
        .send({
          slug: 'video-lesson',
          order: 10,
          title: { ro: 'Video', en: 'Video' },
          excerpt: { ro: 'Scurt', en: 'Short' },
          content: { ro: 'Note', en: 'Notes' },
          type: 'video',
          videoUrl: `https://youtu.be/${YT_ID}`,
          videoDurationSeconds: 210,
        })
        .expect(201);
      expect(create.body.data.videoUrl).toBe(canonicalYt);
      expect(create.body.data.videoDurationSeconds).toBe(210);

      const row = await prisma.lesson.findFirstOrThrow({
        where: { slug: 'video-lesson' },
      });
      expect(row.videoUrl).toBe(canonicalYt);
      expect(row.videoDurationSeconds).toBe(210);
    });

    it('admin creates a text lesson with videoDurationSeconds → 400', async () => {
      const course = await seedPublishedCourse();

      await request(app.getHttpServer())
        .post(`/api/v1/admin/academy/courses/${course.id}/lessons`)
        .set(bearer(admin.accessToken))
        .send({
          slug: 'text-with-duration',
          order: 10,
          title: { ro: 'Text', en: 'Text' },
          excerpt: { ro: 'x', en: 'x' },
          content: { ro: 'Un pic de conținut', en: 'A bit of content' },
          type: 'text',
          videoDurationSeconds: 210,
        })
        .expect(400);
    });

    it('admin creates with an unsupported host → 400', async () => {
      const course = await seedPublishedCourse();

      await request(app.getHttpServer())
        .post(`/api/v1/admin/academy/courses/${course.id}/lessons`)
        .set(bearer(admin.accessToken))
        .send({
          slug: 'evil-lesson',
          order: 10,
          title: { ro: 'Rău', en: 'Bad' },
          excerpt: { ro: 'x', en: 'x' },
          content: { ro: 'x', en: 'x' },
          type: 'video',
          videoUrl: 'https://evil.com/video/123',
        })
        .expect(400);
    });

    it('admin creates a text lesson with a videoUrl → 400', async () => {
      const course = await seedPublishedCourse();

      await request(app.getHttpServer())
        .post(`/api/v1/admin/academy/courses/${course.id}/lessons`)
        .set(bearer(admin.accessToken))
        .send({
          slug: 'text-with-video',
          order: 10,
          title: { ro: 'Text', en: 'Text' },
          excerpt: { ro: 'x', en: 'x' },
          content: { ro: 'x', en: 'x' },
          type: 'text',
          videoUrl: `https://youtu.be/${YT_ID}`,
        })
        .expect(400);
    });

    it('student GET returns the normalized videoUrl', async () => {
      const course = await seedPublishedCourse();
      const create = await request(app.getHttpServer())
        .post(`/api/v1/admin/academy/courses/${course.id}/lessons`)
        .set(bearer(admin.accessToken))
        .send({
          slug: 'video-lesson',
          order: 10,
          title: { ro: 'Video', en: 'Video' },
          excerpt: { ro: 'Scurt', en: 'Short' },
          content: { ro: 'Note', en: 'Notes' },
          type: 'video',
          videoUrl: `https://www.youtube.com/watch?v=${YT_ID}&si=tracked`,
        })
        .expect(201);
      // createLessonSchema is strict and excludes `status` — publish via
      // DB so the student GET can see the row.
      await prisma.lesson.update({
        where: { id: create.body.data.id },
        data: { status: 'published', publishedAt: new Date() },
      });

      // Invite + accept to get a student token with wildcard enrollment.
      await request(app.getHttpServer())
        .post('/api/v1/admin/academy/invitations')
        .set(bearer(admin.accessToken))
        .send({
          email: 'student@example.com',
          name: 'Test Student',
          locale: 'ro',
          initialCourseId: null,
        })
        .expect(201);
      const academyInvite = mockEmail.captured.find(
        (c) => c.template === 'academy-invitation',
      );
      const plaintextToken = extractToken(academyInvite!.url!);
      const accepted = await request(app.getHttpServer())
        .post('/api/v1/academy/auth/invitations/accept-password')
        .send({ token: plaintextToken, password: 'Str0ngPassword!!' })
        .expect(201);
      const studentAccessToken: string = accepted.body.data.accessToken;

      const read = await request(app.getHttpServer())
        .get(
          `/api/v1/academy/courses/${course.slug}/lessons/video-lesson?locale=ro`,
        )
        .set(bearer(studentAccessToken))
        .expect(200);
      const body = unwrap<{
        videoUrl: string;
        videoDurationSeconds: number | null;
        readingTimeMinutes: number | null;
      }>(read);
      expect(body.videoUrl).toBe(canonicalYt);
      // Video lessons: duration surfaces from the DB, reading time stays null.
      expect(body.readingTimeMinutes).toBeNull();
    });
  });
});
