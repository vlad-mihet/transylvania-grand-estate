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
import {
  AdminRole,
  InvitationStatus,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { MetricsService } from '../metrics/metrics.service';
import { ensureSlugUnique } from '../common/utils/ensure-slug-unique.util';
import { toJson } from '../common/utils/prisma-json';
import { withAdvisoryLock } from '../common/utils/advisory-lock.util';
import type { InviteAgentDto } from './dto/invite-agent.dto';
import type { InviteExistingAgentDto } from './dto/invite-existing-agent.dto';
import type { AcceptInvitationPasswordDto } from './dto/accept-invitation-password.dto';
import type { ListInvitationsDto } from './dto/list-invitations.dto';
import type { AgentInvitationLocale } from '../email/templates/agent-invitation.template';

/** Default invitation lifetime when `expiresInDays` isn't explicit. */
const DEFAULT_EXPIRES_DAYS = 7;
/** bcrypt cost shared with register + change-password. */
const BCRYPT_COST = 12;

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  /**
   * Create the Agent profile and a PENDING invitation in one transaction,
   * then fire off the email asynchronously. Admin always sees the Agent
   * row created (email failures don't roll back) — `emailSentAt IS NULL`
   * on the Invitation flags "needs resend" for the admin UI.
   */
  async inviteAgent(dto: InviteAgentDto, actorId: string) {
    await this.ensureNoAgentConflict(dto.email, dto.slug);

    const ttlDays = dto.expiresInDays ?? DEFAULT_EXPIRES_DAYS;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const { plaintext, hash } = this.generateToken();

    const { invitation, agent } = await this.prisma.$transaction(async (tx) => {
      const agent = await tx.agent.create({
        data: {
          slug: dto.slug,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          photo: dto.photo,
          bio: toJson(dto.bio),
          active: dto.active ?? true,
        },
      });
      const invitation = await tx.invitation.create({
        data: {
          email: dto.email,
          tokenHash: hash,
          role: AdminRole.AGENT,
          agentId: agent.id,
          expiresAt,
          invitedById: actorId,
        },
      });
      return { invitation, agent };
    });

    const mailResult = await this.sendInvitationEmail({
      invitationId: invitation.id,
      to: dto.email,
      firstName: dto.firstName,
      plaintext,
      expiresAt,
      actorId,
      locale: dto.locale,
    });

    this.metrics.invitationsCreated.inc({
      role: AdminRole.AGENT,
      flow: 'create_and_invite',
    });

    return {
      id: invitation.id,
      agentId: agent.id,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      emailDelivered: mailResult.ok,
    };
  }

  /**
   * Invite an existing agent that doesn't yet have a login. Used for rows
   * created before the invitation flow existed (public-only profiles) or
   * cases where the admin wants to create the Agent and invite in two
   * separate steps. Rejects if the agent already has an AdminUser or a
   * live PENDING invitation \u2014 the admin should resend the existing one
   * instead of queueing duplicates.
   */
  async inviteExistingAgent(
    agentId: string,
    dto: InviteExistingAgentDto,
    actorId: string,
  ) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        invitation: { select: { id: true, status: true, expiresAt: true } },
      },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    if (agent.adminUserId) {
      throw new ConflictException(
        'This agent already has a linked login account',
      );
    }
    if (
      agent.invitation &&
      agent.invitation.status === InvitationStatus.PENDING &&
      agent.invitation.expiresAt > new Date()
    ) {
      throw new ConflictException({
        message:
          'A pending invitation already exists for this agent \u2014 resend it instead',
        code: 'PENDING_EXISTS',
      });
    }

    const ttlDays = dto.expiresInDays ?? DEFAULT_EXPIRES_DAYS;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const { plaintext, hash } = this.generateToken();

    // If there's a stale (expired/revoked) invitation on this agent, the
    // schema's `agentId` unique constraint forbids inserting another. Reuse
    // the existing row by regenerating its token \u2014 functionally identical
    // to a resend.
    const invitation = agent.invitation
      ? await this.prisma.invitation.update({
          where: { id: agent.invitation.id },
          data: {
            tokenHash: hash,
            status: InvitationStatus.PENDING,
            expiresAt,
            emailSentAt: null,
            acceptedAt: null,
            acceptedVia: null,
            invitedById: actorId,
          },
        })
      : await this.prisma.invitation.create({
          data: {
            email: agent.email,
            tokenHash: hash,
            role: AdminRole.AGENT,
            agentId: agent.id,
            expiresAt,
            invitedById: actorId,
          },
        });

    const mailResult = await this.sendInvitationEmail({
      invitationId: invitation.id,
      to: agent.email,
      firstName: agent.firstName,
      plaintext,
      expiresAt,
      actorId,
      locale: dto.locale,
    });

    this.metrics.invitationsCreated.inc({
      role: AdminRole.AGENT,
      flow: 'invite_existing',
    });

    return {
      id: invitation.id,
      agentId: agent.id,
      email: agent.email,
      expiresAt: invitation.expiresAt,
      emailDelivered: mailResult.ok,
    };
  }

  /**
   * Centralised email-send helper so the three invite paths (create+invite,
   * invite-existing, resend) share one code path for subject/body, actor
   * lookup, and emailSentAt bookkeeping.
   */
  private async sendInvitationEmail(args: {
    invitationId: string;
    to: string;
    firstName: string;
    plaintext: string;
    expiresAt: Date;
    actorId: string | null;
    locale: AgentInvitationLocale | undefined;
  }) {
    const inviter = args.actorId
      ? await this.prisma.adminUser.findUnique({
          where: { id: args.actorId },
          select: { name: true },
        })
      : null;

    const acceptUrl = this.buildAcceptUrl(args.plaintext);
    const mailResult = await this.emailService.sendAgentInvitation(args.to, {
      firstName: args.firstName,
      acceptUrl,
      expiresAt: args.expiresAt,
      invitedByName: inviter?.name,
      locale: args.locale ?? 'ro',
    });

    if (mailResult.ok) {
      await this.prisma.invitation.update({
        where: { id: args.invitationId },
        data: {
          emailSentAt: new Date(),
          emailAttempts: { increment: 1 },
          emailLastAttemptAt: new Date(),
          // Persist the Resend message id so the webhook handler can correlate
          // subsequent bounce/complaint events back to this invitation.
          resendEmailId: mailResult.id !== 'dev-log' ? mailResult.id : null,
          // A successful send clears any prior bounce/reminder markers so
          // admin-initiated resends reset the invitation's mail state.
          bouncedAt: null,
          bounceReason: null,
        },
      });
      // DEBUG: counted by tge_emails_sent_total metric; per-row log is
      // forensic-only. Dropping from INFO keeps the production log stream
      // usable for events worth a human glance.
      this.logger.debug({
        event: 'invitation.email_sent',
        invitationId: args.invitationId,
        toDomain: emailDomain(args.to),
        resendEmailId: mailResult.id,
      });
    } else {
      await this.prisma.invitation.update({
        where: { id: args.invitationId },
        data: {
          emailAttempts: { increment: 1 },
          emailLastAttemptAt: new Date(),
        },
      });
      this.logger.warn({
        event: 'invitation.email_failed',
        invitationId: args.invitationId,
        toDomain: emailDomain(args.to),
        reason: mailResult.reason,
      });
    }
    return mailResult;
  }

  /**
   * Webhook hook: apply a bounce or complaint reported by Resend. Looked up
   * by `resendEmailId` when available, falling back to email + PENDING when
   * the id wasn't captured (e.g. events from before the Phase 2 migration).
   */
  async markBounced(args: {
    resendEmailId: string | null;
    email: string;
    reason: 'hard' | 'soft' | 'complaint';
  }) {
    const where = args.resendEmailId
      ? { resendEmailId: args.resendEmailId }
      : {
          email: args.email.toLowerCase(),
          // Only the most recent PENDING invitation for this email.
          status: InvitationStatus.PENDING as InvitationStatus,
        };
    const target = await this.prisma.invitation.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
    if (!target) {
      this.logger.warn({
        event: 'invitation.bounce_unmatched',
        toDomain: emailDomain(args.email),
        reason: args.reason,
      });
      return { matched: false };
    }
    // Don't overwrite a successfully-accepted invitation \u2014 if the user
    // already completed the flow, a late-arriving bounce is a ghost.
    if (target.status === InvitationStatus.ACCEPTED) {
      return { matched: false };
    }
    await this.prisma.invitation.update({
      where: { id: target.id },
      data: {
        // Hard + complaint mark BOUNCED; soft bounces stay PENDING so the
        // retry cron can try again (transient delivery issues).
        status:
          args.reason === 'soft'
            ? target.status
            : InvitationStatus.BOUNCED,
        bouncedAt: new Date(),
        bounceReason: args.reason,
      },
    });
    this.metrics.invitationsBounced.inc({ reason: args.reason });
    this.logger.log({
      event: 'invitation.bounced',
      invitationId: target.id,
      reason: args.reason,
    });
    return { matched: true, invitationId: target.id };
  }

  /**
   * Called by the public accept-invite page on mount with the plaintext
   * token from the email URL. Returns enough metadata to greet the agent
   * by name; never leaks whether the email exists or not beyond the token
   * matching/mismatching.
   */
  async verify(token: string) {
    const invitation = await this.findValidByToken(token);
    return {
      email: invitation.email,
      firstName: invitation.agent?.firstName ?? '',
      lastName: invitation.agent?.lastName ?? '',
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  /**
   * Password-path acceptance: creates the AdminUser, links the Agent, and
   * issues a fresh JWT pair. Token is marked ACCEPTED atomically so a
   * parallel request can't consume it twice.
   */
  async acceptWithPassword(dto: AcceptInvitationPasswordDto) {
    const invitation = await this.findValidByToken(dto.token);
    if (!invitation.agentId || !invitation.agent) {
      // AGENT invitations always have an agent; other roles aren't
      // invitable in v1 so this is effectively unreachable. Fail loudly
      // so it doesn't silently produce an orphan AdminUser.
      throw new ConflictException('Invitation is missing its linked Agent');
    }

    await this.ensureEmailNotTaken(invitation.email);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    const fullName = `${invitation.agent.firstName} ${invitation.agent.lastName}`.trim();

    const endTimer = this.metrics.invitationAcceptDuration.startTimer({
      method: 'password',
    });
    const created = await this.prisma.$transaction(async (tx) => {
      // Atomic claim: flip PENDING \u2192 ACCEPTED only if nobody else has.
      // Two concurrent accepts race here; the loser sees count=0 and aborts
      // before creating a duplicate AdminUser (whose unique email constraint
      // would surface a less-helpful error). This is the one-shot guard \u2014
      // every downstream write assumes we own the invitation.
      const claim = await tx.invitation.updateMany({
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
      const user = await tx.adminUser.create({
        data: {
          email: invitation.email,
          passwordHash,
          name: fullName,
          role: invitation.role,
        },
      });
      await tx.agent.update({
        where: { id: invitation.agentId! },
        data: { adminUserId: user.id },
      });
      return user;
    });
    endTimer();
    this.metrics.invitationsAccepted.inc({ method: 'password' });

    return this.authService.issueTokensForUserId(created.id);
  }

  /**
   * Google-path acceptance: creates the AdminUser (no password), links the
   * Agent, writes the OAuthIdentity, and issues a token pair. Email-match
   * is enforced at the caller (auth controller) before we ever reach here.
   */
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
    if (!invitation.agentId || !invitation.agent) {
      throw new ConflictException('Invitation is missing its linked Agent');
    }
    if (invitation.email.toLowerCase() !== profile.email.toLowerCase()) {
      throw new ForbiddenException({
        message:
          'The Google account email does not match the invitation email.',
        code: 'EMAIL_MISMATCH',
      });
    }

    await this.ensureEmailNotTaken(invitation.email);

    const fullName =
      `${invitation.agent.firstName} ${invitation.agent.lastName}`.trim();

    const endTimer = this.metrics.invitationAcceptDuration.startTimer({
      method: 'google',
    });
    const created = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.invitation.updateMany({
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
      const user = await tx.adminUser.create({
        data: {
          email: invitation.email,
          passwordHash: null,
          name: fullName,
          role: invitation.role,
        },
      });
      await tx.oAuthIdentity.create({
        data: {
          provider: 'GOOGLE',
          providerAccountId: profile.providerAccountId,
          adminUserId: user.id,
          email: profile.email,
        },
      });
      await tx.agent.update({
        where: { id: invitation.agentId! },
        data: { adminUserId: user.id },
      });
      return user;
    });
    endTimer();
    this.metrics.invitationsAccepted.inc({ method: 'google' });

    return this.authService.issueTokensForUserId(created.id);
  }

  async list(filters: ListInvitationsDto) {
    const statusMap: Record<string, InvitationStatus> = {
      pending: InvitationStatus.PENDING,
      accepted: InvitationStatus.ACCEPTED,
      expired: InvitationStatus.EXPIRED,
      revoked: InvitationStatus.REVOKED,
      bounced: InvitationStatus.BOUNCED,
    };
    const where: Prisma.InvitationWhereInput = filters.status
      ? { status: statusMap[filters.status] }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          agent: {
            select: { id: true, firstName: true, lastName: true, slug: true },
          },
          invitedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.invitation.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role,
        status: r.status,
        expiresAt: r.expiresAt,
        acceptedAt: r.acceptedAt,
        acceptedVia: r.acceptedVia,
        emailSentAt: r.emailSentAt,
        emailAttempts: r.emailAttempts,
        bouncedAt: r.bouncedAt,
        bounceReason: r.bounceReason,
        createdAt: r.createdAt,
        agent: r.agent,
        invitedBy: r.invitedBy,
      })),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async resend(id: string, actorId: string, locale?: AgentInvitationLocale) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
      include: { agent: true },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new ConflictException(
        'Cannot resend an invitation that has already been accepted',
      );
    }

    const { plaintext, hash } = this.generateToken();
    const expiresAt = new Date(
      Date.now() + DEFAULT_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );
    const updated = await this.prisma.invitation.update({
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
      firstName: invitation.agent?.firstName ?? '',
      plaintext,
      expiresAt,
      actorId,
      locale,
    });

    return {
      id: updated.id,
      expiresAt: updated.expiresAt,
      emailDelivered: mailResult.ok,
    };
  }

  async revoke(id: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new ConflictException(
        'Cannot revoke an invitation that has already been accepted',
      );
    }
    const out = await this.prisma.invitation.update({
      where: { id },
      data: { status: InvitationStatus.REVOKED },
    });
    this.metrics.invitationsRevoked.inc();
    return out;
  }

  /**
   * Retry cron for PENDING invitations whose email failed to send. Runs
   * every 10 minutes, exponentially backs off per-invitation, caps at 5
   * attempts. A successful send clears the retry state.
   *
   * Caveat: we regenerate the token on each attempt because the plaintext
   * from the failed send isn't recoverable. That's harmless \u2014 the failed
   * email never reached the recipient \u2014 but means a miracle late-delivery
   * of an earlier attempt would point to a stale token (accept flow returns
   * 410 expired/not-found; admin resends).
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async retryFailedEmails(): Promise<void> {
    await withAdvisoryLock(this.prisma, 'invitation.retry', () =>
      this.retryFailedEmailsInner(),
    );
  }

  private async retryFailedEmailsInner(): Promise<void> {
    const BACKOFFS_MS = [
      1 * 60_000,    // 1 min
      5 * 60_000,    // 5 min
      15 * 60_000,   // 15 min
      60 * 60_000,   // 1 hour
      4 * 60 * 60_000, // 4 hours
    ];
    const MAX_ATTEMPTS = BACKOFFS_MS.length;

    // Pull a small batch; 10min cadence × 50 attempts/run comfortably covers
    // any reasonable outage. Larger batches risk hammering Resend if their
    // API is degraded (which is exactly when these rows accumulate).
    const candidates = await this.prisma.invitation.findMany({
      where: {
        status: InvitationStatus.PENDING,
        emailSentAt: null,
        emailAttempts: { lt: MAX_ATTEMPTS },
        expiresAt: { gt: new Date() },
      },
      include: { agent: true },
      take: 50,
      orderBy: { emailLastAttemptAt: { sort: 'asc', nulls: 'first' } },
    });

    for (const inv of candidates) {
      const lastAttempt = inv.emailLastAttemptAt?.getTime() ?? 0;
      const dueAt =
        lastAttempt + BACKOFFS_MS[Math.min(inv.emailAttempts, BACKOFFS_MS.length - 1)];
      if (lastAttempt > 0 && Date.now() < dueAt) continue;

      const { plaintext, hash } = this.generateToken();
      await this.prisma.invitation.update({
        where: { id: inv.id },
        data: { tokenHash: hash },
      });

      await this.sendInvitationEmail({
        invitationId: inv.id,
        to: inv.email,
        firstName: inv.agent?.firstName ?? '',
        plaintext,
        expiresAt: inv.expiresAt,
        actorId: inv.invitedById,
        locale: 'ro',
      });
    }

    if (candidates.length > 0) {
      this.logger.log({
        event: 'invitation.retry_processed',
        count: candidates.length,
      });
    }
  }

  /**
   * Reminder cron. Hourly sweep for PENDING invitations expiring in ~24h
   * that haven't yet had a reminder sent. We don't have the plaintext
   * token anymore (only its sha256 hash), so the reminder cron rotates it
   * and emails the fresh one. The original link from 6 days ago might
   * still be in the user's inbox \u2014 that's now stale, intentionally. The
   * reminder email is the single authoritative link going forward.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendExpiryReminders(): Promise<void> {
    await withAdvisoryLock(this.prisma, 'invitation.reminder', () =>
      this.sendExpiryRemindersInner(),
    );
  }

  private async sendExpiryRemindersInner(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // +23h
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000); // +25h

    const candidates = await this.prisma.invitation.findMany({
      where: {
        status: InvitationStatus.PENDING,
        emailSentAt: { not: null },
        reminderSentAt: null,
        // Skip soft-bounced invitations — status remains PENDING (only hard
        // bounces flip to BOUNCED), but a reminder to a known-bouncing
        // address just produces another bounce. The invitation will expire
        // naturally; admin can resend if they have a corrected address.
        bouncedAt: null,
        expiresAt: { gte: windowStart, lte: windowEnd },
      },
      include: { agent: true },
      take: 50,
    });

    for (const inv of candidates) {
      const { plaintext, hash } = this.generateToken();
      await this.prisma.invitation.update({
        where: { id: inv.id },
        data: { tokenHash: hash },
      });
      const acceptUrl = this.buildAcceptUrl(plaintext);
      const result = await this.emailService.sendInvitationReminder(inv.email, {
        firstName: inv.agent?.firstName ?? '',
        acceptUrl,
        expiresAt: inv.expiresAt,
        locale: 'ro',
      });
      // Mark the reminder as sent even on delivery failure \u2014 the next hour
      // would otherwise retry repeatedly. Bounces / failures are surfaced
      // via Resend webhooks (P1.1), which is the right place to react.
      await this.prisma.invitation.update({
        where: { id: inv.id },
        data: { reminderSentAt: new Date() },
      });
      if (!result.ok) {
        this.logger.warn({
          event: 'invitation.reminder_failed',
          invitationId: inv.id,
          reason: result.reason,
        });
      }
    }
    if (candidates.length > 0) {
      this.logger.log({
        event: 'invitation.reminder_batch_sent',
        count: candidates.length,
      });
    }
  }

  /**
   * Hourly sweep that flips long-stale PENDING invitations to EXPIRED so the
   * admin list shows accurate status without a read-time correction. The
   * token is also checked defensively on accept — this cron is an optimisation,
   * not a safety boundary.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireStale(): Promise<void> {
    await withAdvisoryLock(this.prisma, 'invitation.expire', () =>
      this.expireStaleInner(),
    );
  }

  private async expireStaleInner(): Promise<void> {
    const { count } = await this.prisma.invitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: InvitationStatus.EXPIRED },
    });
    if (count > 0) {
      this.metrics.invitationsExpired.inc(count);
      this.logger.log({ event: 'invitation.expired_bulk', count });
    }
  }

  /**
   * Resolve a plaintext token to an actionable invitation. Collapses the
   * not-found / wrong-status / expired branches into distinct HTTP codes so
   * the UI can render the right message:
   *   - 404 NotFound: token unknown or revoked (same message to avoid leak)
   *   - 410 Gone: token was valid but expired or already accepted
   */
  private async findValidByToken(plaintext: string) {
    const tokenHash = this.hashToken(plaintext);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { agent: true },
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

  private async ensureNoAgentConflict(email: string, slug: string) {
    const existingAgent = await this.prisma.agent.findFirst({
      where: { OR: [{ email }, { slug }] },
      select: { email: true, slug: true },
    });
    if (existingAgent) {
      if (existingAgent.email === email) {
        throw new ConflictException('Agent with this email already exists');
      }
      throw new ConflictException('Agent slug is already taken');
    }
    // Slug uniqueness is also enforced by DB, but surface a clean 409 first.
    await ensureSlugUnique(slug, 'Agent', (s) =>
      this.prisma.agent.findUnique({ where: { slug: s }, select: { id: true } }),
    );
  }

  private async ensureEmailNotTaken(email: string) {
    const existing = await this.prisma.adminUser.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ForbiddenException({
        message: 'An account with this email already exists',
        code: 'EMAIL_TAKEN',
      });
    }
  }

  private buildAcceptUrl(token: string): string {
    const base = this.config
      .getOrThrow<string>('ADMIN_PUBLIC_URL')
      .replace(/\/$/, '');
    return `${base}/accept-invite?token=${encodeURIComponent(token)}`;
  }

  private generateToken() {
    const plaintext = randomBytes(32).toString('base64url');
    const hash = this.hashToken(plaintext);
    return { plaintext, hash };
  }

  private hashToken(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }
}

/**
 * Extract the email's domain for structured-log payloads. Keeps PII (the
 * local part) out of the log stream while retaining aggregation utility
 * (bounces by domain, send success rate by domain, etc.).
 */
function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : 'unknown';
}
