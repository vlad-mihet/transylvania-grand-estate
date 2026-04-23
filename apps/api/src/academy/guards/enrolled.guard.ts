import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Confirms the authenticated academy user has at least one non-revoked
 * enrollment. Composes with `JwtAcademyAuthGuard` — the JWT guard must run
 * first so `req.user` is populated before this reads it. For per-course
 * endpoints, check the specific course in the service rather than broad-
 * banding here; this guard only answers "does the user have ANY academy
 * access". Wildcard rows (courseId NULL) count as a yes.
 */
@Injectable()
export class EnrolledGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { id?: string } }>();
    if (!user?.id) {
      throw new ForbiddenException('Not authenticated');
    }
    const enrollment = await this.prisma.academyEnrollment.findFirst({
      where: { userId: user.id, revokedAt: null },
      select: { id: true },
    });
    if (!enrollment) {
      throw new ForbiddenException({
        message: 'You are not enrolled in any academy content',
        code: 'NOT_ENROLLED',
      });
    }
    return true;
  }
}
