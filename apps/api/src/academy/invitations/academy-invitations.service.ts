import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvitationStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { MetricsService } from '../../metrics/metrics.service';
import { AcademyAuthService } from '../auth/academy-auth.service';
import {
  InviteAcademyUserDto,
  AcceptAcademyInvitationWithPasswordDto,
} from './dto/invite-academy-user.dto';
import type { AcademyInvitationLocale } from '../../email/templates/academy-invitation.template';
import { pickLocalized } from '../utils/locale-fallback';
import { withAdvisoryLock } from '../../common/utils/advisory-lock.util';

const DEFAULT_EXPIRES_DAYS = 7;
const BCRYPT_COST = 12;

/**
 * Academy invitation lifecycle. Mirrors InvitationsService but for the
 * AcademyUser pool. Admin (ADMIN+/SUPER_ADMIN) issues invitations; the
 * invitee accepts via password or Google. On acceptance the service
 * creates the AcademyUser row and (when specified) the initial enrollment.
 */
@Injectable()
export class AcademyInvitationsService {
  private readonly logger = new Logger(AcademyInvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AcademyAuthService))
    private readonly authService: AcademyAuthService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  async invite(dto: InviteAcademyUserDto, actorId: string) {
    const existingUser = await this.prisma.academyUser.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException({
        message: 'An academy account with this email already exists',
        code: 'EMAIL_TAKEN',
      });
    }

    if (dto.initialCourseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.initialCourseId },
        select: { id: true },
      });
      if (!course) throw new NotFoundException('Course not found');
    }

    const ttlDays = dto.expiresInDays ?? DEFAULT_EXPIRES_DAYS;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const { plaintext, hash } = this.generateToken();

    const invitation = await this.prisma.academyInvitation.create({
      data: {
        email: dto.email,
        tokenHash: hash,
        expiresAt,
        invitedById: actorId,
        initialCourseId: dto.initialCourseId ?? null,
      },
    });

    const mailResult = await this.sendInvitationEmail({
      invitationId: invitation.id,
      to: dto.email,
      name: dto.name,
      plaintext,
      expiresAt,
      actorId,
      locale: this.normalizeLocale(dto.locale),
      initialCourseId: dto.initialCourseId ?? null,
    });

    this.metrics.academyInvitations.inc({ outcome: 'created' });
    return {
      id: invitation.id,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      emailDelivered: mailResult.ok,
      // Dev-only escape hatch: when no Resend key is configured, the
      // email is only logged to stdout — expose the URL in the API
      // response so the admin UI can surface it directly instead of
      // asking devs to tail server logs. Never populated in production
      // deployments with a real email provider.
      devAcceptUrl: this.shouldExposeDevUrl()
        ? this.buildAcceptUrl(plaintext)
        : undefined,
    };
  }

  async verify(token: string) {
    const invitation = await this.findValidByToken(token);
    let initialCourseTitle: string | null = null;
    if (invitation.initialCourseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: invitation.initialCourseId },
        select: { title: true },
      });
      if (course) {
        initialCourseTitle = pickLocalized(course.title, 'ro').text || null;
      }
    }
    return {
      email: invitation.email,
      // Name is set on acceptance (from the invite form; the invitee may
      // differ from who the admin intended). Surfacing the stored invitation
      // name here is misleading — leave to UI to prompt "confirm your name".
      name: '',
      expiresAt: invitation.expiresAt.toISOString(),
      initialCourseTitle,
    };
  }

  async acceptWithPassword(dto: AcceptAcademyInvitationWithPasswordDto) {
    const invitation = await this.findValidByToken(dto.token);
    await this.ensureEmailNotTaken(invitation.email);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const { user } = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.academyInvitation.updateMany({
        where: { id: invitation.id, status: InvitationStatus.PENDING },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          acceptedVia: 'password',
        },
      });
      if (claim.count === 0) {
        throw new ConflictException('Invitation was already claimed');
      }
      const user = await tx.academyUser.create({
        data: {
          email: invitation.email,
          passwordHash,
          // Name defaults to the email local part; the UI flow allows
          // setting it post-acceptance on /account.
          name: invitation.email.split('@')[0] ?? 'Student',
        },
      });
      await tx.academyInvitation.update({
        where: { id: invitation.id },
        data: { acceptedUserId: user.id },
      });
      await this.grantInitialEnrollment(tx, {
        userId: user.id,
        courseId: invitation.initialCourseId,
        grantedById: invitation.invitedById ?? user.id,
      });
      return { user };
    });

    this.metrics.academyInvitations.inc({ outcome: 'accepted' });
    return this.authService.issueTokensForUserId(user.id);
  }

  async acceptWithGoogle(
    token: string,
    profile: {
      providerAccountId: string;
      email: string;
      firstName: string;
      lastName: string;
    },
  ) {
    const invitation = await this.findValidByToken(token);
    if (invitation.email.toLowerCase() !== profile.email.toLowerCase()) {
      throw new ForbiddenException({
        message: 'The Google account email does not match the invitation email.',
        code: 'EMAIL_MISMATCH',
      });
    }
    await this.ensureEmailNotTaken(invitation.email);

    const fullName =
      `${profile.firstName} ${profile.lastName}`.trim() ||
      profile.email.split('@')[0] ||
      'Student';

    const { user } = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.academyInvitation.updateMany({
        where: { id: invitation.id, status: InvitationStatus.PENDING },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          acceptedVia: 'google',
        },
      });
      if (claim.count === 0) {
        throw new ConflictException('Invitation was already claimed');
      }
      const user = await tx.academyUser.create({
        data: {
          email: invitation.email,
          passwordHash: null,
          name: fullName,
        },
      });
      await tx.academyUserIdentity.create({
        data: {
          provider: 'GOOGLE',
          providerAccountId: profile.providerAccountId,
          userId: user.id,
          email: profile.email,
          emailVerified: true,
        },
      });
      await tx.academyInvitation.update({
        where: { id: invitation.id },
        data: { acceptedUserId: user.id },
      });
      await this.grantInitialEnrollment(tx, {
        userId: user.id,
        courseId: invitation.initialCourseId,
        grantedById: invitation.invitedById ?? user.id,
      });
      return { user };
    });

    this.metrics.academyInvitations.inc({ outcome: 'accepted' });
    return this.authService.issueTokensForUserId(user.id);
  }

  async list(params: {
    page: number;
    limit: number;
    status?: string;
    email?: string;
  }) {
    const statusMap: Record<string, InvitationStatus> = {
      pending: InvitationStatus.PENDING,
      accepted: InvitationStatus.ACCEPTED,
      expired: InvitationStatus.EXPIRED,
      revoked: InvitationStatus.REVOKED,
      bounced: InvitationStatus.BOUNCED,
    };
    const where: Prisma.AcademyInvitationWhereInput = {};
    if (params.status) where.status = statusMap[params.status];
    if (params.email) {
      // Substring match so the student-detail page can find invitations
      // for a given account even if trailing whitespace or casing
      // differs between invite time and accept time.
      where.email = { contains: params.email.trim(), mode: 'insensitive' };
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.academyInvitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          initialCourse: { select: { id: true, slug: true, title: true } },
        },
      }),
      this.prisma.academyInvitation.count({ where }),
    ]);
    return {
      data: rows,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  async resend(id: string, actorId: string) {
    const invitation = await this.prisma.academyInvitation.findUnique({
      where: { id },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new ConflictException('Invitation has already been accepted');
    }

    const { plaintext, hash } = this.generateToken();
    const expiresAt = new Date(
      Date.now() + DEFAULT_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );
    const updated = await this.prisma.academyInvitation.update({
      where: { id },
      data: {
        tokenHash: hash,
        status: InvitationStatus.PENDING,
        expiresAt,
        emailSentAt: null,
      },
    });

    const mailResult = await this.sendInvitationEmail({
      invitationId: updated.id,
      to: invitation.email,
      name: invitation.email.split('@')[0] ?? 'Student',
      plaintext,
      expiresAt,
      actorId,
      locale: 'ro',
      initialCourseId: invitation.initialCourseId,
    });

    this.metrics.academyInvitations.inc({ outcome: 'resent' });
    return {
      id: updated.id,
      expiresAt: updated.expiresAt,
      emailDelivered: mailResult.ok,
    };
  }

  async revoke(id: string) {
    const invitation = await this.prisma.academyInvitation.findUnique({
      where: { id },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new ConflictException('Cannot revoke an accepted invitation');
    }
    const updated = await this.prisma.academyInvitation.update({
      where: { id },
      data: { status: InvitationStatus.REVOKED },
    });
    this.metrics.academyInvitations.inc({ outcome: 'revoked' });
    return updated;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireStale(): Promise<void> {
    await withAdvisoryLock(this.prisma, 'academy-invitation.expire', () =>
      this.expireStaleInner(),
    );
  }

  private async expireStaleInner(): Promise<void> {
    const { count } = await this.prisma.academyInvitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: InvitationStatus.EXPIRED },
    });
    if (count > 0) {
      this.metrics.academyInvitations.inc({ outcome: 'expired' }, count);
      this.logger.log({ event: 'academy.invitation.expired_bulk', count });
    }
  }

  /**
   * Retry cron for academy invitations whose email failed to send. Same
   * shape as the admin `invitations.service.ts:retryFailedEmails` —
   * exponential backoff, cap at 5 attempts, token regenerated each time.
   * Bounces are OUT of scope here (webhook marks them BOUNCED); this cron
   * only retries rows where the send attempt itself failed.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async retryFailedEmails(): Promise<void> {
    await withAdvisoryLock(this.prisma, 'academy-invitation.retry', () =>
      this.retryFailedEmailsInner(),
    );
  }

  private async retryFailedEmailsInner(): Promise<void> {
    const BACKOFFS_MS = [
      1 * 60_000,
      5 * 60_000,
      15 * 60_000,
      60 * 60_000,
      4 * 60 * 60_000,
    ];
    const MAX_ATTEMPTS = BACKOFFS_MS.length;

    const candidates = await this.prisma.academyInvitation.findMany({
      where: {
        status: InvitationStatus.PENDING,
        emailSentAt: null,
        emailAttempts: { lt: MAX_ATTEMPTS },
        expiresAt: { gt: new Date() },
      },
      take: 50,
      orderBy: { emailLastAttemptAt: { sort: 'asc', nulls: 'first' } },
    });

    for (const inv of candidates) {
      const lastAttempt = inv.emailLastAttemptAt?.getTime() ?? 0;
      const dueAt =
        lastAttempt +
        BACKOFFS_MS[Math.min(inv.emailAttempts, BACKOFFS_MS.length - 1)];
      if (lastAttempt > 0 && Date.now() < dueAt) continue;

      const { plaintext, hash } = this.generateToken();
      await this.prisma.academyInvitation.update({
        where: { id: inv.id },
        data: { tokenHash: hash },
      });

      await this.sendInvitationEmail({
        invitationId: inv.id,
        to: inv.email,
        name: inv.email.split('@')[0] ?? 'Student',
        plaintext,
        expiresAt: inv.expiresAt,
        actorId: inv.invitedById,
        locale: 'ro',
        initialCourseId: inv.initialCourseId,
      });
    }

    if (candidates.length > 0) {
      this.logger.log({
        event: 'academy.invitation.retry_processed',
        count: candidates.length,
      });
    }
  }

  /**
   * Hourly reminder sweep for invitations expiring in 23–25h. Rotates the
   * token (the original plaintext isn't recoverable) and sends the
   * academy-branded reminder email. `reminderSentAt` ensures each row
   * gets at most one nudge even if the cron runs mid-window twice.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendExpiryReminders(): Promise<void> {
    await withAdvisoryLock(this.prisma, 'academy-invitation.reminder', () =>
      this.sendExpiryRemindersInner(),
    );
  }

  private async sendExpiryRemindersInner(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const candidates = await this.prisma.academyInvitation.findMany({
      where: {
        status: InvitationStatus.PENDING,
        emailSentAt: { not: null },
        reminderSentAt: null,
        expiresAt: { gte: windowStart, lte: windowEnd },
      },
      take: 50,
    });

    for (const inv of candidates) {
      const { plaintext, hash } = this.generateToken();
      await this.prisma.academyInvitation.update({
        where: { id: inv.id },
        data: { tokenHash: hash },
      });
      const acceptUrl = this.buildAcceptUrl(plaintext);
      const result = await this.emailService.sendAcademyInvitationReminder(
        inv.email,
        {
          name: inv.email.split('@')[0] ?? 'Student',
          acceptUrl,
          expiresAt: inv.expiresAt,
          locale: 'ro',
        },
      );
      // Mark `reminderSentAt` regardless of delivery result — bounces
      // land on the webhook path; a transient send failure here would
      // otherwise re-fire the same reminder on every subsequent hour.
      await this.prisma.academyInvitation.update({
        where: { id: inv.id },
        data: { reminderSentAt: new Date() },
      });
      if (!result.ok) {
        this.logger.warn({
          event: 'academy.invitation.reminder_failed',
          invitationId: inv.id,
          reason: result.reason,
        });
      }
    }
    if (candidates.length > 0) {
      this.logger.log({
        event: 'academy.invitation.reminder_batch_sent',
        count: candidates.length,
      });
    }
  }

  /**
   * Webhook-driven bounce flip. Signature mirrors `InvitationsService.
   * markBounced` so the `/webhooks/resend` dispatcher can hand off to
   * either service with the same input shape. Soft bounces stay PENDING
   * (retry cron handles them); hard bounces + complaints flip to BOUNCED.
   */
  async markBounced(args: {
    resendEmailId: string | null;
    email: string;
    reason: 'hard' | 'soft' | 'complaint';
  }): Promise<{ matched: boolean; invitationId?: string }> {
    const where = args.resendEmailId
      ? { resendEmailId: args.resendEmailId }
      : {
          email: args.email.toLowerCase(),
          status: InvitationStatus.PENDING as InvitationStatus,
        };
    const target = await this.prisma.academyInvitation.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
    if (!target) {
      this.logger.warn({
        event: 'academy.invitation.bounce_unmatched',
        reason: args.reason,
      });
      return { matched: false };
    }
    if (target.status === InvitationStatus.ACCEPTED) {
      // Late-arriving bounce on an already-accepted invitation is a
      // ghost — user already completed the flow out of band.
      return { matched: false };
    }
    await this.prisma.academyInvitation.update({
      where: { id: target.id },
      data: {
        status:
          args.reason === 'soft'
            ? target.status
            : InvitationStatus.BOUNCED,
        bouncedAt: new Date(),
        bounceReason: args.reason,
      },
    });
    if (args.reason !== 'soft') {
      this.metrics.academyInvitations.inc({ outcome: 'bounced' });
    }
    this.logger.log({
      event: 'academy.invitation.bounced',
      invitationId: target.id,
      reason: args.reason,
    });
    return { matched: true, invitationId: target.id };
  }

  private async sendInvitationEmail(args: {
    invitationId: string;
    to: string;
    name: string;
    plaintext: string;
    expiresAt: Date;
    actorId: string | null;
    locale: AcademyInvitationLocale;
    initialCourseId: string | null;
  }) {
    const inviter = args.actorId
      ? await this.prisma.adminUser.findUnique({
          where: { id: args.actorId },
          select: { name: true },
        })
      : null;
    let courseTitle: string | null = null;
    if (args.initialCourseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: args.initialCourseId },
        select: { title: true },
      });
      if (course) {
        courseTitle = pickLocalized(course.title, args.locale === 'ro' ? 'ro' : 'en').text || null;
      }
    }

    const acceptUrl = this.buildAcceptUrl(args.plaintext);
    const mailResult = await this.emailService.sendAcademyInvitation(args.to, {
      name: args.name,
      acceptUrl,
      expiresAt: args.expiresAt,
      invitedByName: inviter?.name,
      courseTitle,
      locale: args.locale,
    });

    if (mailResult.ok) {
      await this.prisma.academyInvitation.update({
        where: { id: args.invitationId },
        data: {
          emailSentAt: new Date(),
          emailAttempts: { increment: 1 },
          emailLastAttemptAt: new Date(),
          resendEmailId: mailResult.id !== 'dev-log' ? mailResult.id : null,
          bouncedAt: null,
          bounceReason: null,
        },
      });
    } else {
      await this.prisma.academyInvitation.update({
        where: { id: args.invitationId },
        data: {
          emailAttempts: { increment: 1 },
          emailLastAttemptAt: new Date(),
        },
      });
      this.logger.warn({
        event: 'academy.invitation.email_failed',
        invitationId: args.invitationId,
        reason: mailResult.reason,
      });
    }
    return mailResult;
  }

  private async grantInitialEnrollment(
    tx: Prisma.TransactionClient,
    args: { userId: string; courseId: string | null; grantedById: string },
  ) {
    await tx.academyEnrollment.create({
      data: {
        userId: args.userId,
        courseId: args.courseId,
        grantedById: args.grantedById,
      },
    });
  }

  private async findValidByToken(plaintext: string) {
    const tokenHash = this.hashToken(plaintext);
    const invitation = await this.prisma.academyInvitation.findUnique({
      where: { tokenHash },
    });
    if (!invitation || invitation.status === InvitationStatus.REVOKED) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new GoneException('Invitation has already been used');
    }
    if (
      invitation.status === InvitationStatus.EXPIRED ||
      invitation.expiresAt < new Date()
    ) {
      throw new GoneException('Invitation has expired');
    }
    return invitation;
  }

  private async ensureEmailNotTaken(email: string) {
    const existing = await this.prisma.academyUser.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ForbiddenException({
        message: 'An academy account with this email already exists',
        code: 'EMAIL_TAKEN',
      });
    }
  }

  private buildAcceptUrl(token: string): string {
    const base = this.config
      .getOrThrow<string>('ACADEMY_PUBLIC_URL')
      .replace(/\/$/, '');
    return `${base}/accept-invite?token=${encodeURIComponent(token)}`;
  }

  /**
   * True when emails aren't actually being delivered (dev / un-provisioned
   * prod). In that case the invitation endpoint includes `devAcceptUrl`
   * in the response so the admin UI can show it to the editor instead of
   * asking them to tail server logs. Always false once Resend is wired.
   */
  private shouldExposeDevUrl(): boolean {
    return !this.config.get<string>('RESEND_API_KEY');
  }

  private generateToken() {
    const plaintext = randomBytes(32).toString('base64url');
    const hash = this.hashToken(plaintext);
    return { plaintext, hash };
  }

  private hashToken(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }

  private normalizeLocale(
    locale: string | undefined,
  ): AcademyInvitationLocale {
    return locale === 'ro' || locale === 'en' ? locale : 'ro';
  }
}
