import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
}
