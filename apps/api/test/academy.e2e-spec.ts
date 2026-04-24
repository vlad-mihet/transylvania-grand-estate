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
 *   3. Revoke-mid-flight — per-request DB access check so revoking an
 *      enrollment fails the next lesson read with no TTL wait needed.
 *   4. Public visibility — courses flagged `visibility: public` are readable
 *      by any authenticated academy user; the dedicated catalog endpoint
 *      surfaces them without an enrollment lookup.
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
    it('next lesson read returns 404 after enrollment is revoked', async () => {
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
      // the service-layer access check returns null on a revoked
      // enrollment for an `enrolled` course, which surfaces as 404 at the
      // controller. Either way, no TTL wait is required: the per-request
      // DB check ensures revocation is immediate.
      await request(app.getHttpServer())
        .get(`/api/v1/academy/courses/${course.slug}/lessons/${lesson.slug}`)
        .set(bearer(studentAccessToken))
        .expect(404);
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

  // ── 4. Public visibility ────────────────────────────────────────────

  describe('public visibility', () => {
    async function seedPublicAndEnrolled() {
      const [publicCourse, enrolledCourse] = await Promise.all([
        prisma.course.create({
          data: {
            slug: 'public-intro',
            title: { ro: 'Intro public', en: 'Public intro' },
            description: { ro: 'Oricine', en: 'Anyone' },
            status: 'published',
            visibility: 'public',
            order: 10,
            publishedAt: new Date(),
          },
        }),
        prisma.course.create({
          data: {
            slug: 'enrolled-deep-dive',
            title: { ro: 'Deep dive', en: 'Deep dive' },
            description: { ro: 'Doar înscriși', en: 'Enrolled only' },
            status: 'published',
            visibility: 'enrolled',
            order: 20,
            publishedAt: new Date(),
          },
        }),
      ]);
      const publicLesson = await prisma.lesson.create({
        data: {
          courseId: publicCourse.id,
          slug: 'welcome',
          order: 10,
          title: { ro: 'Bun venit', en: 'Welcome' },
          excerpt: { ro: 'Scurt', en: 'Short' },
          content: { ro: 'Conținut public', en: 'Public content' },
          type: 'text',
          status: 'published',
          publishedAt: new Date(),
        },
      });
      return { publicCourse, enrolledCourse, publicLesson };
    }

    /**
     * Builds a brand-new academy user with ZERO enrollments and returns an
     * access token. Used to validate that a user with no grants still lands
     * on a non-empty catalog.
     */
    async function createUnenrolledStudent(): Promise<string> {
      const jwt = app.get(JwtService);
      const user = await prisma.academyUser.create({
        data: {
          email: `unenrolled-${Date.now()}@example.com`,
          passwordHash: null,
          name: 'Unenrolled Student',
          emailVerifiedAt: new Date(),
        },
      });
      return jwt.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          realm: 'academy',
        },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: '15m',
        },
      );
    }

    it('GET /academy/courses/catalog returns only public courses for an unenrolled user', async () => {
      const { publicCourse } = await seedPublicAndEnrolled();
      const token = await createUnenrolledStudent();

      const res = await request(app.getHttpServer())
        .get('/api/v1/academy/courses/catalog')
        .set(bearer(token))
        .expect(200);
      const catalog = unwrap<Array<{ slug: string; visibility: string }>>(res);
      const slugs = catalog.map((c) => c.slug);
      expect(slugs).toContain(publicCourse.slug);
      expect(slugs).not.toContain('enrolled-deep-dive');
      expect(catalog.every((c) => c.visibility === 'public')).toBe(true);
    });

    it('GET /academy/courses returns an empty list (not 403) for an unenrolled user', async () => {
      await seedPublicAndEnrolled();
      const token = await createUnenrolledStudent();

      const res = await request(app.getHttpServer())
        .get('/api/v1/academy/courses')
        .set(bearer(token))
        .expect(200);
      expect(unwrap<unknown[]>(res)).toEqual([]);
    });

    it('public course detail + lesson are readable without enrollment', async () => {
      const { publicCourse, publicLesson } = await seedPublicAndEnrolled();
      const token = await createUnenrolledStudent();

      await request(app.getHttpServer())
        .get(`/api/v1/academy/courses/${publicCourse.slug}`)
        .set(bearer(token))
        .expect(200);

      const lesson = await request(app.getHttpServer())
        .get(
          `/api/v1/academy/courses/${publicCourse.slug}/lessons/${publicLesson.slug}`,
        )
        .set(bearer(token))
        .expect(200);
      expect(unwrap<{ content: string }>(lesson).content).toContain(
        'Conținut public',
      );
    });

    it('enrolled-visibility course is still 404 for an unenrolled user', async () => {
      const { enrolledCourse } = await seedPublicAndEnrolled();
      const token = await createUnenrolledStudent();

      // Course detail returns 404 for private courses the user can't see —
      // the service collapses the no-access case into not-found to avoid
      // leaking existence.
      await request(app.getHttpServer())
        .get(`/api/v1/academy/courses/${enrolledCourse.slug}`)
        .set(bearer(token))
        .expect(404);
    });
  });

  // ── 5. Self-service enrollment (public courses) ────────────────────

  describe('self-service enrollment', () => {
    async function seedPublicAndEnrolled() {
      const [publicCourse, enrolledCourse] = await Promise.all([
        prisma.course.create({
          data: {
            slug: 'public-intro',
            title: { ro: 'Intro public', en: 'Public intro' },
            description: { ro: 'Oricine', en: 'Anyone' },
            status: 'published',
            visibility: 'public',
            order: 10,
            publishedAt: new Date(),
          },
        }),
        prisma.course.create({
          data: {
            slug: 'enrolled-deep-dive',
            title: { ro: 'Deep dive', en: 'Deep dive' },
            description: { ro: 'Doar înscriși', en: 'Enrolled only' },
            status: 'published',
            visibility: 'enrolled',
            order: 20,
            publishedAt: new Date(),
          },
        }),
      ]);
      const publicLesson = await prisma.lesson.create({
        data: {
          courseId: publicCourse.id,
          slug: 'welcome',
          order: 10,
          title: { ro: 'Bun venit', en: 'Welcome' },
          excerpt: { ro: 'Scurt', en: 'Short' },
          content: { ro: 'Conținut public', en: 'Public content' },
          type: 'text',
          status: 'published',
          publishedAt: new Date(),
        },
      });
      return { publicCourse, enrolledCourse, publicLesson };
    }

    async function createUnenrolledStudent(): Promise<{
      userId: string;
      token: string;
    }> {
      const jwt = app.get(JwtService);
      const user = await prisma.academyUser.create({
        data: {
          email: `enrollee-${Date.now()}-${Math.random()}@example.com`,
          passwordHash: null,
          name: 'Enrollee',
          emailVerifiedAt: new Date(),
        },
      });
      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          realm: 'academy',
        },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: '15m',
        },
      );
      return { userId: user.id, token };
    }

    it('POST /academy/courses/:slug/enroll creates a per-course row and the course surfaces on /courses', async () => {
      const { publicCourse } = await seedPublicAndEnrolled();
      const { userId, token } = await createUnenrolledStudent();

      await request(app.getHttpServer())
        .post(`/api/v1/academy/courses/${publicCourse.slug}/enroll`)
        .set(bearer(token))
        .expect(200)
        .expect((res) => expect(res.body.data.enrolled).toBe(true));

      const rows = await prisma.academyEnrollment.findMany({
        where: { userId, revokedAt: null },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].courseId).toBe(publicCourse.id);
      expect(rows[0].grantedById).toBeNull();

      const dashboard = await request(app.getHttpServer())
        .get('/api/v1/academy/courses')
        .set(bearer(token))
        .expect(200);
      const list = unwrap<Array<{ slug: string; enrolled: boolean; canUnenroll: boolean }>>(dashboard);
      expect(list).toHaveLength(1);
      expect(list[0].slug).toBe(publicCourse.slug);
      expect(list[0].enrolled).toBe(true);
      expect(list[0].canUnenroll).toBe(true);
    });

    it('POST enroll twice is idempotent — no duplicate row, no error', async () => {
      const { publicCourse } = await seedPublicAndEnrolled();
      const { userId, token } = await createUnenrolledStudent();

      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post(`/api/v1/academy/courses/${publicCourse.slug}/enroll`)
          .set(bearer(token))
          .expect(200);
      }
      const rows = await prisma.academyEnrollment.findMany({
        where: { userId, courseId: publicCourse.id },
      });
      expect(rows).toHaveLength(1);
    });

    it('POST enroll on an enrolled-visibility course returns 403', async () => {
      const { enrolledCourse } = await seedPublicAndEnrolled();
      const { token } = await createUnenrolledStudent();

      await request(app.getHttpServer())
        .post(`/api/v1/academy/courses/${enrolledCourse.slug}/enroll`)
        .set(bearer(token))
        .expect(403);
    });

    it('POST enroll on a nonexistent slug returns 404', async () => {
      const { token } = await createUnenrolledStudent();

      await request(app.getHttpServer())
        .post('/api/v1/academy/courses/does-not-exist/enroll')
        .set(bearer(token))
        .expect(404);
    });

    it('opening a lesson on a public course auto-upserts an enrollment row', async () => {
      const { publicCourse, publicLesson } = await seedPublicAndEnrolled();
      const { userId, token } = await createUnenrolledStudent();

      await request(app.getHttpServer())
        .get(
          `/api/v1/academy/courses/${publicCourse.slug}/lessons/${publicLesson.slug}`,
        )
        .set(bearer(token))
        .expect(200);

      const rows = await prisma.academyEnrollment.findMany({
        where: { userId, revokedAt: null },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].courseId).toBe(publicCourse.id);
      expect(rows[0].grantedById).toBeNull();
    });

    it('DELETE /academy/courses/:slug/enroll soft-revokes the self-service row', async () => {
      const { publicCourse } = await seedPublicAndEnrolled();
      const { userId, token } = await createUnenrolledStudent();

      await request(app.getHttpServer())
        .post(`/api/v1/academy/courses/${publicCourse.slug}/enroll`)
        .set(bearer(token))
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/academy/courses/${publicCourse.slug}/enroll`)
        .set(bearer(token))
        .expect(200)
        .expect((res) => expect(res.body.data.enrolled).toBe(false));

      const row = await prisma.academyEnrollment.findFirst({
        where: { userId, courseId: publicCourse.id },
      });
      expect(row?.revokedAt).not.toBeNull();

      // Dashboard drops the course; catalog still lists it without the
      // enrolled flag.
      const dashboard = await request(app.getHttpServer())
        .get('/api/v1/academy/courses')
        .set(bearer(token))
        .expect(200);
      expect(unwrap<unknown[]>(dashboard)).toEqual([]);

      const catalog = await request(app.getHttpServer())
        .get('/api/v1/academy/courses/catalog')
        .set(bearer(token))
        .expect(200);
      const entry = unwrap<Array<{ slug: string; enrolled: boolean }>>(catalog).find(
        (c) => c.slug === publicCourse.slug,
      );
      expect(entry?.enrolled).toBe(false);
    });

    it('DELETE returns 404 when the user has no self-service row (admin-granted only)', async () => {
      const { publicCourse } = await seedPublicAndEnrolled();
      const { userId, token } = await createUnenrolledStudent();

      // Admin-style grant (grantedById non-null). A self-unenroll against
      // this row must fail — admin grants are not student-removable.
      await prisma.academyEnrollment.create({
        data: {
          userId,
          courseId: publicCourse.id,
          grantedById: admin.userId,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/academy/courses/${publicCourse.slug}/enroll`)
        .set(bearer(token))
        .expect(404);

      // And the admin grant is untouched.
      const row = await prisma.academyEnrollment.findFirst({
        where: { userId, courseId: publicCourse.id },
      });
      expect(row?.revokedAt).toBeNull();
    });

    it('DELETE then re-POST un-revokes the same row', async () => {
      const { publicCourse } = await seedPublicAndEnrolled();
      const { userId, token } = await createUnenrolledStudent();

      await request(app.getHttpServer())
        .post(`/api/v1/academy/courses/${publicCourse.slug}/enroll`)
        .set(bearer(token))
        .expect(200);
      const firstId = (
        await prisma.academyEnrollment.findFirstOrThrow({
          where: { userId, courseId: publicCourse.id },
        })
      ).id;

      await request(app.getHttpServer())
        .delete(`/api/v1/academy/courses/${publicCourse.slug}/enroll`)
        .set(bearer(token))
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/v1/academy/courses/${publicCourse.slug}/enroll`)
        .set(bearer(token))
        .expect(200);

      const rows = await prisma.academyEnrollment.findMany({
        where: { userId, courseId: publicCourse.id },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(firstId);
      expect(rows[0].revokedAt).toBeNull();
      expect(rows[0].grantedById).toBeNull();
    });

    it('self-service verify-email no longer creates a wildcard — dashboard is empty post-verify', async () => {
      await seedPublicAndEnrolled();

      // Register + verify end-to-end.
      await request(app.getHttpServer())
        .post('/api/v1/academy/auth/register')
        .send({
          email: 'fresh@example.com',
          password: 'Str0ngPassword!!',
          name: 'Fresh User',
          locale: 'ro',
        })
        .expect(201);

      const verify = mockEmail.captured.find(
        (c) => c.template === 'academy-verification',
      );
      expect(verify).toBeDefined();
      const token = new URL(verify!.url!).searchParams.get('token')!;

      const verified = await request(app.getHttpServer())
        .post('/api/v1/academy/auth/verify-email')
        .send({ token })
        .expect(201);
      const accessToken: string = verified.body.data.accessToken;

      // No wildcard row means the dashboard is empty until the user
      // enrolls (button or lesson read).
      const dashboard = await request(app.getHttpServer())
        .get('/api/v1/academy/courses')
        .set(bearer(accessToken))
        .expect(200);
      expect(unwrap<unknown[]>(dashboard)).toEqual([]);

      const rows = await prisma.academyEnrollment.findMany({
        where: { user: { email: 'fresh@example.com' } },
      });
      expect(rows).toEqual([]);
    });
  });
});
