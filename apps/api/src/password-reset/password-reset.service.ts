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
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { withAdvisoryLock } from '../common/utils/advisory-lock.util';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { MetricsService } from '../metrics/metrics.service';
import { AuditService } from '../audit/audit.service';
import type { AgentInvitationLocale } from '../email/templates/agent-invitation.template';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const BCRYPT_COST = 12;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Always completes with a 202-style response regardless of whether the
   * email matches a real user \u2014 that's the only way to avoid leaking
   * account existence on an unauthenticated endpoint. Throttling is handled
   * one level up in the controller.
   */
  async requestReset(dto: ForgotPasswordDto, locale?: AgentInvitationLocale) {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, email: true, passwordHash: true, name: true },
    });

    // Silently ignore: no user, or SSO-only user (passwordHash NULL). In the
    // second case, Google is their identity provider \u2014 we'd never want a
    // password reset to create a password and bypass the SSO pairing.
    if (!user || !user.passwordHash) {
      this.logger.log({
        event: 'password_reset.ignored',
        reason: !user ? 'no_account' : 'sso_only',
        toDomain: emailDomain(dto.email),
      });
      return { ok: true as const };
    }

    // Per-email cooldown. IP throttling catches distributed spraying, but a
    // determined attacker on rotating IPs could still mailbomb a specific
    // inbox. Silently drop if we already issued a reset to this user in the
    // last 60 seconds \u2014 preserving the anti-enumeration contract (the
    // response is identical whether we send or not). The earlier token is
    // still valid; re-requesting before then is pointless for the user too.
    const recent = await this.prisma.passwordResetToken.findFirst({
      where: {
        adminUserId: user.id,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
      select: { id: true },
    });
    if (recent) {
      this.logger.log({
        event: 'password_reset.cooldown_suppressed',
        adminUserId: user.id,
      });
      return { ok: true as const };
    }

    // Invalidate any outstanding unused tokens for this user. One live link
    // at a time \u2014 if a user clicks "forgot password" twice, the older link
    // becomes useless the moment the newer one is issued. Prevents
    // confused-inbox scenarios and reduces the attack surface.
    await this.prisma.passwordResetToken.updateMany({
      where: { adminUserId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const { plaintext, hash } = this.generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash: hash,
        adminUserId: user.id,
        expiresAt,
      },
    });
    this.metrics.passwordResetsIssued.inc();

    const resetUrl = this.buildResetUrl(plaintext);
    // First name for greeting \u2014 parse from `AdminUser.name` which is a free
    // string. If it's a single word, use it; otherwise take the first token.
    const firstName = user.name?.split(/\s+/)[0] ?? null;

    const mail = await this.emailService.sendPasswordReset(user.email, {
      firstName,
      resetUrl,
      expiresAt,
      locale: locale ?? 'ro',
    });
    if (!mail.ok) {
      this.logger.warn({
        event: 'password_reset.email_failed',
        adminUserId: user.id,
        reason: mail.reason,
      });
    } else {
      this.logger.log({
        event: 'password_reset.email_sent',
        adminUserId: user.id,
      });
    }

    return { ok: true as const };
  }

  /** Called by the verify endpoint on page mount to check the token. */
  async verify(token: string) {
    const record = await this.findValidByToken(token);
    const user = await this.prisma.adminUser.findUnique({
      where: { id: record.adminUserId },
      select: { email: true, name: true },
    });
    if (!user) {
      // Race: user deleted between token issue and verify. Treat as not found
      // to keep the error surface flat.
      throw new NotFoundException('Reset token not found');
    }
    return {
      email: user.email,
      firstName: user.name?.split(/\s+/)[0] ?? null,
    };
  }

  /** Consume the token, set the new password, issue fresh auth tokens. */
  async reset(dto: ResetPasswordDto) {
    const record = await this.findValidByToken(dto.token);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const userId = await this.prisma.$transaction(async (tx) => {
      // Atomic consume: flip usedAt only if still null. Blocks double-spend
      // races the same way accept-invite does.
      const claim = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claim.count === 0) {
        throw new ConflictException('Reset token was already consumed');
      }
      await tx.adminUser.update({
        where: { id: record.adminUserId },
        data: { passwordHash },
      });
      return record.adminUserId;
    });

    // Best-effort cleanup of other outstanding tokens for the same user \u2014
    // they'd expire on their own but invalidating immediately is cheaper
    // than waiting for the purge cron to catch up.
    await this.prisma.passwordResetToken.updateMany({
      where: {
        adminUserId: userId,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
    this.metrics.passwordResetsCompleted.inc();

    // Audit row anchors to the user whose password changed. actorId is the
    // same user \u2014 they proved control of the email inbox by consuming the
    // token, so they are effectively the actor. This is a real compliance
    // question ("when did this user's password last change?").
    void this.audit.record({
      actorId: userId,
      action: 'user.password-reset',
      resource: 'AdminUser',
      resourceId: userId,
    });

    return this.authService.issueTokensForUserId(userId);
  }

  /**
   * Daily purge of stale reset tokens. Keeps the table from growing without
   * bound and makes exports / GDPR sweeps predictable. Tokens past `expiresAt`
   * are already unusable \u2014 we just garbage-collect the rows.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpired(): Promise<void> {
    await withAdvisoryLock(this.prisma, 'password_reset.purge', async () => {
      const { count } = await this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            { usedAt: { not: null } },
          ],
        },
      });
      if (count > 0) {
        this.logger.log({ event: 'password_reset.purged_bulk', count });
      }
    });
  }

  private async findValidByToken(plaintext: string) {
    const tokenHash = this.hashToken(plaintext);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record) {
      throw new NotFoundException('Reset token not found');
    }
    if (record.usedAt) {
      throw new GoneException('Reset token has already been used');
    }
    if (record.expiresAt < new Date()) {
      throw new GoneException('Reset token has expired');
    }
    return record;
  }

  private buildResetUrl(token: string): string {
    const base = this.config
      .getOrThrow<string>('ADMIN_PUBLIC_URL')
      .replace(/\/$/, '');
    return `${base}/reset-password?token=${encodeURIComponent(token)}`;
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

// Dev-time ergonomics: silence unused import warnings when the typechecker
// hasn't walked into the DTO types yet.
void ConflictException;
void ForbiddenException;

function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : 'unknown';
}
