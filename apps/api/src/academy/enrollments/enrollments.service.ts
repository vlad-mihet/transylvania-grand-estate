import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, CourseVisibility, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AcademyAuthService } from '../auth/academy-auth.service';
import type {
  GrantEnrollmentDto,
  ListEnrollmentsDto,
} from './dto/enrollments.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AcademyAuthService,
  ) {}

  async list(query: ListEnrollmentsDto) {
    const { page = 1, limit = 20, userId, courseId, includeRevoked } = query;
    const where: Prisma.AcademyEnrollmentWhereInput = {};
    if (userId) where.userId = userId;
    if (courseId) where.courseId = courseId;
    if (!includeRevoked) where.revokedAt = null;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.academyEnrollment.findMany({
        where,
        orderBy: { enrolledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
          course: { select: { id: true, slug: true, title: true } },
        },
      }),
      this.prisma.academyEnrollment.count({ where }),
    ]);
    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async grant(dto: GrantEnrollmentDto, actorId: string) {
    const user = await this.prisma.academyUser.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Academy user not found');
    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
        select: { id: true },
      });
      if (!course) throw new NotFoundException('Course not found');
    }

    // Uniqueness is `(userId, courseId)` with NULL-as-wildcard. Prisma's
    // compound unique selector doesn't accept null for courseId
    // (Postgres NULL semantics in unique indexes), so we match via
    // findFirst with an explicit `courseId: null | <id>`. If the exact
    // row exists and is revoked, re-activate; if active, 409.
    const existing = await this.prisma.academyEnrollment.findFirst({
      where: {
        userId: dto.userId,
        courseId: dto.courseId ?? null,
      },
    });
    if (existing && existing.revokedAt === null) {
      throw new ConflictException('Enrollment already exists');
    }
    if (existing) {
      return this.prisma.academyEnrollment.update({
        where: { id: existing.id },
        data: {
          revokedAt: null,
          enrolledAt: new Date(),
          grantedById: actorId,
        },
      });
    }
    return this.prisma.academyEnrollment.create({
      data: {
        userId: dto.userId,
        courseId: dto.courseId ?? null,
        grantedById: actorId,
      },
    });
  }

  /**
   * Soft-revoke (sets `revokedAt`). Does NOT blow up in-flight access
   * tokens — the EnrolledGuard re-checks on every request, and the staleness
   * window is capped by JWT_ACCESS_EXPIRATION (default 15m). If operators
   * need hard revocation sooner, the targeted path is a separate "force
   * signout" admin action that revokes refresh jtis too.
   */
  async revoke(id: string) {
    const row = await this.prisma.academyEnrollment.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Enrollment not found');
    if (row.revokedAt) return row;
    return this.prisma.academyEnrollment.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  // ── Student self-service ────────────────────────────────────────────

  /**
   * Self-service enroll for public courses. Idempotent: if the user already
   * has an active wildcard (admin-granted or legacy self-service) or a
   * per-course row, we return the existing state. If a previously revoked
   * self-service row exists, we un-revoke it. Called from the catalog's
   * "Înscrie-te" button.
   *
   * Throws 404 if the slug doesn't exist or the course isn't published;
   * 403 if visibility is `enrolled` — those require an admin grant.
   */
  async selfEnrollInPublicCourse(userId: string, slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      select: { id: true, status: true, visibility: true },
    });
    if (!course || course.status !== CourseStatus.published) {
      throw new NotFoundException('Course not found');
    }
    if (course.visibility !== CourseVisibility.public) {
      throw new ForbiddenException({
        message: 'This course requires an admin grant — self-enroll is not allowed',
        code: 'INVALID_VISIBILITY',
      });
    }

    // Wildcard short-circuit: the user already sees every published course,
    // creating a per-course row would be redundant data. The response still
    // reports `enrolled: true` so the UI flips state.
    const wildcard = await this.prisma.academyEnrollment.findFirst({
      where: { userId, courseId: null, revokedAt: null },
      select: { id: true },
    });
    if (wildcard) return { enrolled: true, reason: 'wildcard' as const };

    const existing = await this.prisma.academyEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    if (existing) {
      if (existing.revokedAt === null) {
        return { enrolled: true, reason: 'already_active' as const };
      }
      await this.prisma.academyEnrollment.update({
        where: { id: existing.id },
        data: {
          revokedAt: null,
          enrolledAt: new Date(),
          // Do NOT overwrite grantedById — a revoked admin grant stays
          // admin-owned; a revoked self-service row stays self-service.
        },
      });
      return { enrolled: true, reason: 'reactivated' as const };
    }

    await this.prisma.academyEnrollment.create({
      data: {
        userId,
        courseId: course.id,
        grantedById: null,
      },
    });
    return { enrolled: true, reason: 'created' as const };
  }

  /**
   * Self-service unenroll. Only touches the caller's own self-service row
   * for the given course — admin-granted rows and wildcards are out of
   * scope (users can't unilaterally drop access an admin configured, and
   * wildcards are all-or-nothing).
   *
   * Returns 404 when there is no self-service row to revoke (the UI should
   * only offer the menu when `canUnenroll: true`).
   */
  async selfUnenrollFromCourse(userId: string, slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    const row = await this.prisma.academyEnrollment.findFirst({
      where: {
        userId,
        courseId: course.id,
        revokedAt: null,
        grantedById: null,
      },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException(
        'No self-service enrollment to revoke for this course',
      );
    }
    await this.prisma.academyEnrollment.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return { enrolled: false };
  }

  /**
   * Silent upsert invoked from `LessonsService.findForStudent` when a user
   * reads a lesson on a public-visibility course. Skips when a wildcard is
   * already in effect (legacy self-service or admin). Never throws — the
   * lesson read path shouldn't fail just because the side-effect write
   * bumped into a race; the next lesson read / enroll button will retry.
   */
  async autoEnrollIfPublic(userId: string, courseId: string): Promise<void> {
    try {
      const wildcard = await this.prisma.academyEnrollment.findFirst({
        where: { userId, courseId: null, revokedAt: null },
        select: { id: true },
      });
      if (wildcard) return;

      const existing = await this.prisma.academyEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (existing?.revokedAt === null) return;
      if (existing) {
        await this.prisma.academyEnrollment.update({
          where: { id: existing.id },
          data: { revokedAt: null, enrolledAt: new Date() },
        });
        return;
      }
      await this.prisma.academyEnrollment.create({
        data: { userId, courseId, grantedById: null },
      });
    } catch {
      // Swallow — auto-enroll is a best-effort side effect of reading a
      // lesson, not a required step. A follow-up read or an explicit
      // enroll click will recover.
    }
  }
}
