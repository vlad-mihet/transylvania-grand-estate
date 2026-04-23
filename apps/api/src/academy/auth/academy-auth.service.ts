import {
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { MetricsService } from '../../metrics/metrics.service';
import { AuditService } from '../../audit/audit.service';
import { AcademyLoginDto } from './dto/login.dto';
import { AcademyChangePasswordDto } from './dto/change-password.dto';
import type {
  AcademyForgotPasswordDto,
  AcademyResetPasswordDto,
  UpdateAcademyProfileDto,
} from './dto/forgot-password.dto';
import type {
  AcademyRegisterDto,
  AcademyResendVerificationDto,
  AcademyVerifyEmailDto,
} from './dto/register.dto';

interface AcademyAuthUserShape {
  id: string;
  email: string;
  name: string;
}

/**
 * Auth surface for the academy realm. Parallels AuthService but scoped to
 * the AcademyUser pool. Tokens always carry `realm: 'academy'` so the
 * admin strategies reject them on sight. Revocation uses a parallel
 * `AcademyRevokedToken` denylist.
 */
@Injectable()
export class AcademyAuthService {
  private readonly logger = new Logger(AcademyAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly metrics: MetricsService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: AcademyLoginDto) {
    const user = await this.prisma.academyUser.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      this.metrics.academyLogins.inc({ result: 'failure' });
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.passwordHash) {
      // SSO-only accounts (accepted invite via Google) mirror the admin
      // 403-USE_SSO pattern so the UI can prompt the correct button.
      this.metrics.academyLogins.inc({ result: 'failure' });
      throw new ForbiddenException({
        message: 'This account signs in with Google',
        code: 'USE_SSO',
      });
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      this.metrics.academyLogins.inc({ result: 'failure' });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.academyUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    this.metrics.academyLogins.inc({ result: 'success' });
    return this.generateTokens(this.shape(user));
  }

  async refresh(userId: string) {
    const user = await this.prisma.academyUser.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.generateTokens(this.shape(user));
  }

  async revokeRefreshToken(
    jti: string,
    userId: string,
    reason: 'logout' | 'user_deleted' | 'forced' | 'enrollment_revoked',
  ): Promise<void> {
    if (!jti) return;
    await this.prisma.academyRevokedToken.upsert({
      where: { jti },
      create: { jti, userId, reason },
      update: {},
    });
  }

  async isRefreshTokenRevoked(jti: string): Promise<boolean> {
    if (!jti) return false;
    const hit = await this.prisma.academyRevokedToken.findUnique({
      where: { jti },
      select: { jti: true },
    });
    return hit !== null;
  }

  /** Daily purge; parallel to AuthService.purgeRevokedTokens. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeRevokedTokens(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.prisma.academyRevokedToken.deleteMany({
      where: { revokedAt: { lt: cutoff } },
    });
  }

  async issueTokensForUserId(userId: string) {
    const user = await this.prisma.academyUser.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.generateTokens(this.shape(user));
  }

  /**
   * Returning-user signup / sign-in via Google — if the Google identity
   * already maps to an academy user, issue tokens; otherwise call
   * `provisionViaGoogleSignup` to create the user inline. This is the
   * idempotent entry point for the `intent=register` OAuth branch, so
   * a user who clicks "Sign up with Google" twice doesn't get a
   * confusing "email already exists" error.
   */
  async signInOrProvisionViaGoogle(profile: {
    providerAccountId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<{ accessToken: string; refreshToken: string; user: AcademyAuthUserShape }> {
    const identity = await this.prisma.academyUserIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'GOOGLE',
          providerAccountId: profile.providerAccountId,
        },
      },
      select: { userId: true },
    });
    if (identity) {
      return this.issueTokensForUserId(identity.userId);
    }
    return this.provisionViaGoogleSignup(profile);
  }

  /**
   * Google sign-in for a returning academy user. Same philosophy as the
   * admin flow: no email-fallback lookup — an unknown Google account at
   * /academy/auth/google means they haven't been invited (or unlinked),
   * so an admin needs to issue a fresh invitation.
   */
  async signInWithGoogle(profile: {
    providerAccountId: string;
    email: string;
  }) {
    const identity = await this.prisma.academyUserIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'GOOGLE',
          providerAccountId: profile.providerAccountId,
        },
      },
      select: { userId: true },
    });
    if (!identity) {
      throw new UnauthorizedException({
        message: 'No academy account linked to this Google identity',
        code: 'NO_ACCOUNT',
      });
    }
    return this.issueTokensForUserId(identity.userId);
  }

  async changePassword(userId: string, dto: AcademyChangePasswordDto) {
    const user = await this.prisma.academyUser.findUnique({
      where: { id: userId },
    });
    if (!user || !user.passwordHash) {
      // SSO-only users don't have a current password to verify against.
      throw new ForbiddenException({
        message: 'This account has no password to change',
        code: 'USE_SSO',
      });
    }
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.academyUser.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { ok: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.academyUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        locale: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateAcademyProfileDto) {
    const data: { name?: string; locale?: string | null } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.locale !== undefined) data.locale = dto.locale;
    const updated = await this.prisma.academyUser.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        locale: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return updated;
  }

  /**
   * Always-success entrypoint for forgot-password. We silently swallow
   * the "user not found" case so a caller can't enumerate the academy
   * user pool. Rate-limited at the controller (3 req/min/IP) as a
   * belt-and-suspenders against brute-force probes. SSO-only users (no
   * passwordHash) can still request a reset — we mail them a set-password
   * link, which after use converts them into a password-capable account.
   */
  async requestPasswordReset(dto: AcademyForgotPasswordDto) {
    const user = await this.prisma.academyUser.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, email: true, name: true, locale: true },
    });
    if (!user) {
      this.metrics.academyPasswordResets.inc({ outcome: 'unknown_email' });
      this.logger.debug({
        event: 'academy.password_reset.unknown_email',
        toDomain: emailDomain(dto.email),
      });
      return { ok: true };
    }

    const plaintext = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(plaintext).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Proactively invalidate older unused tokens — a user who clicks
    // "Forgot password" twice in a row shouldn't leave a window where
    // the first link still works.
    await this.prisma.academyPasswordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.prisma.academyPasswordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = this.buildResetUrl(plaintext);
    const mailResult = await this.emailService.sendAcademyPasswordReset(
      user.email,
      {
        name: user.name,
        resetUrl,
        expiresAt,
        locale: user.locale === 'ro' ? 'ro' : 'en',
      },
    );
    if (!mailResult.ok) {
      // Log but don't surface — caller must not learn whether email
      // went out (that would leak account existence just as badly).
      this.logger.warn({
        event: 'academy.password_reset.send_failed',
        toDomain: emailDomain(user.email),
        reason: mailResult.reason,
      });
    }
    this.metrics.academyPasswordResets.inc({ outcome: 'requested' });
    return { ok: true };
  }

  /**
   * Consume a reset token and set the new password. Single-use — flips
   * `usedAt` atomically via `updateMany` so a racing second request sees
   * `count=0` and aborts before hashing or writing.
   */
  async resetPassword(dto: AcademyResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const record = await this.prisma.academyPasswordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record) throw new NotFoundException('Reset token not found');
    if (record.usedAt) throw new GoneException('Reset token already used');
    if (record.expiresAt < new Date()) {
      throw new GoneException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.academyPasswordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claim.count === 0) {
        throw new GoneException('Reset token already used');
      }
      await tx.academyUser.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
    });

    this.metrics.academyPasswordResets.inc({ outcome: 'completed' });
    return { ok: true };
  }

  /**
   * Daily cron: evict expired / used reset tokens past a generous
   * retention window. Mirrors the admin `PasswordResetModule` cadence.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeResetTokens(): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.prisma.academyPasswordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: cutoff } },
          { usedAt: { lt: cutoff } },
        ],
      },
    });
  }

  private buildResetUrl(token: string): string {
    const base = this.configService
      .getOrThrow<string>('ACADEMY_PUBLIC_URL')
      .replace(/\/$/, '');
    return `${base}/reset-password?token=${encodeURIComponent(token)}`;
  }

  private buildVerificationUrl(token: string): string {
    const base = this.configService
      .getOrThrow<string>('ACADEMY_PUBLIC_URL')
      .replace(/\/$/, '');
    return `${base}/verify-email?token=${encodeURIComponent(token)}`;
  }

  /**
   * Public self-service registration. Always returns 202 regardless of
   * whether the email is new, a pending unverified dup, or a taken
   * verified account — the response copy on the controller is the
   * anti-enumeration generic "check your inbox". The real signal lives
   * in the metrics counter (`outcome` label).
   *
   * Side-effect: creates a fresh AcademyUser (if new) or rotates the
   * verification token + re-sends the email (if pending). For verified
   * addresses, no DB writes; the counter fires `email_taken` and the
   * endpoint still returns 202.
   *
   * Anti-abuse: the tight controller throttle (3/min) is the primary
   * defence; the email-verification gate ensures no tokens are issued
   * without a working inbox. If scraping ever becomes a problem, add
   * hCaptcha on the frontend — don't weaken the silent-202 pattern.
   */
  async register(dto: AcademyRegisterDto): Promise<{ ok: true }> {
    const normalizedEmail = dto.email.toLowerCase();
    const existing = await this.prisma.academyUser.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        locale: true,
        emailVerifiedAt: true,
      },
    });

    if (existing?.emailVerifiedAt) {
      this.metrics.academyRegistrations.inc({ outcome: 'email_taken' });
      this.logger.debug({
        event: 'academy.register.email_taken_verified',
        toDomain: emailDomain(normalizedEmail),
      });
      return { ok: true };
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const locale = dto.locale ?? 'ro';
    let userId: string;
    let name: string;

    if (existing) {
      // Unverified retry — update password + name so the most-recent
      // register attempt wins, then rotate the verification token. This
      // gracefully handles "I typed my password wrong in the form".
      await this.prisma.academyUser.update({
        where: { id: existing.id },
        data: { passwordHash, name: dto.name, locale },
      });
      userId = existing.id;
      name = dto.name;
    } else {
      const created = await this.prisma.academyUser.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: dto.name,
          locale,
        },
        select: { id: true, name: true },
      });
      userId = created.id;
      name = created.name;
    }

    await this.issueVerificationToken(userId, normalizedEmail, name, locale);
    this.metrics.academyRegistrations.inc({ outcome: 'requested' });
    // Self-attributed audit entry — the registrant is both actor and
    // subject. A separate `academy-user.verify-email` row lands when the
    // token is consumed, so the audit trail captures both halves of the
    // flow (and reveals abandoned verifications as "register without a
    // matching verify").
    void this.auditService.record({
      actorId: userId,
      action: 'academy-user.self-register',
      resource: 'AcademyUser',
      resourceId: userId,
    });
    return { ok: true };
  }

  /**
   * Consumes a verification token. On success: marks `emailVerifiedAt`,
   * grants a wildcard `AcademyEnrollment` (open-catalog auto-enrollment),
   * and issues access + refresh tokens so the caller lands on the
   * dashboard without a second login round-trip.
   *
   * Wildcard grant caveat: this assumes every published course is free.
   * If paid courses land later, the enrollment creation here must become
   * per-course or no-grant (with checkout producing the enrollment).
   *
   * Concurrency: `updateMany(usedAt IS NULL)` is the atomic claim. Two
   * parallel requests with the same token — only one sees `count=1`;
   * the second gets 410.
   */
  async verifyEmail(
    dto: AcademyVerifyEmailDto,
  ): Promise<{ accessToken: string; refreshToken: string; user: AcademyAuthUserShape }> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const record = await this.prisma.academyEmailVerificationToken.findUnique({
      where: { tokenHash },
    });
    if (!record) {
      this.metrics.academyVerifications.inc({ outcome: 'invalid' });
      throw new NotFoundException('Verification token not found');
    }
    if (record.usedAt) {
      this.metrics.academyVerifications.inc({ outcome: 'already_verified' });
      throw new GoneException('Verification token already used');
    }
    if (record.expiresAt < new Date()) {
      this.metrics.academyVerifications.inc({ outcome: 'expired' });
      throw new GoneException('Verification token has expired');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.academyEmailVerificationToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claim.count === 0) {
        throw new GoneException('Verification token already used');
      }
      const updated = await tx.academyUser.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date(), lastLoginAt: new Date() },
        select: { id: true, email: true, name: true },
      });
      // Wildcard enrollment — grantedById NULL marks this as a
      // self-service row so audit dashboards can tell it apart from
      // admin grants. `createMany + skipDuplicates` handles the edge
      // case where an invitation already granted one: Prisma's
      // compound-unique-with-null doesn't match via upsert (SQL treats
      // nulls as not-equal-to-null), so a plain create() followed by
      // a duplicate catch is the canonical workaround.
      await tx.academyEnrollment.createMany({
        data: [
          {
            userId: updated.id,
            courseId: null,
            grantedById: null,
          },
        ],
        skipDuplicates: true,
      });
      return updated;
    });

    this.metrics.academyVerifications.inc({ outcome: 'success' });
    this.metrics.academyRegistrations.inc({ outcome: 'verified' });
    void this.auditService.record({
      actorId: user.id,
      action: 'academy-user.verify-email',
      resource: 'AcademyUser',
      resourceId: user.id,
    });
    return this.generateTokens(this.shape(user));
  }

  /**
   * Resends a verification email. Anti-enumeration: returns 202 whether
   * the address exists, is already verified, or was never seen. Only the
   * "exists and not yet verified" case triggers a new token + email.
   */
  async resendVerification(
    dto: AcademyResendVerificationDto,
  ): Promise<{ ok: true }> {
    const normalizedEmail = dto.email.toLowerCase();
    const user = await this.prisma.academyUser.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        locale: true,
        emailVerifiedAt: true,
      },
    });
    if (!user || user.emailVerifiedAt) {
      this.logger.debug({
        event: 'academy.resend_verification.noop',
        toDomain: emailDomain(normalizedEmail),
        reason: user ? 'already_verified' : 'unknown_email',
      });
      return { ok: true };
    }
    await this.issueVerificationToken(
      user.id,
      user.email,
      user.name,
      user.locale ?? 'ro',
    );
    return { ok: true };
  }

  /**
   * Admin-triggered variant of resendVerification. Unlike the public
   * endpoint, this one surfaces "already verified" / "user not found"
   * as real errors because the admin is authenticated and the anti-
   * enumeration concern doesn't apply.
   */
  async adminResendVerification(userId: string): Promise<{ ok: true }> {
    const user = await this.prisma.academyUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        locale: true,
        emailVerifiedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Academy user not found');
    if (user.emailVerifiedAt) {
      throw new GoneException({
        message: 'User email is already verified',
        code: 'ALREADY_VERIFIED',
      });
    }
    await this.issueVerificationToken(
      user.id,
      user.email,
      user.name,
      user.locale ?? 'ro',
    );
    return { ok: true };
  }

  /**
   * Writes a fresh verification token and sends the email. Existing
   * unused tokens for the same user are invalidated (single outstanding
   * link at any time) to avoid confusion when a user requests a resend.
   */
  private async issueVerificationToken(
    userId: string,
    email: string,
    name: string,
    locale: string,
  ): Promise<void> {
    const plaintext = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(plaintext).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await this.prisma.$transaction([
      this.prisma.academyEmailVerificationToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.academyEmailVerificationToken.create({
        data: { userId, email, tokenHash, expiresAt },
      }),
    ]);

    const verifyUrl = this.buildVerificationUrl(plaintext);
    const mailResult = await this.emailService.sendAcademyVerification(email, {
      name,
      verifyUrl,
      expiresAt,
      locale: locale === 'ro' ? 'ro' : 'en',
    });
    if (!mailResult.ok) {
      this.logger.warn({
        event: 'academy.verification.send_failed',
        toDomain: emailDomain(email),
        reason: mailResult.reason,
      });
    }
  }

  /**
   * Daily cron: purge consumed / long-expired verification tokens. Runs
   * alongside the reset-token purge on the same 3AM schedule.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeVerificationTokens(): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.prisma.academyEmailVerificationToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }],
      },
    });
  }

  /**
   * Self-service account provisioning via Google. Reached from the
   * `/academy/auth/google?intent=register` callback when no existing
   * identity/user matches the Google profile. Creates the user + Google
   * identity + wildcard enrollment in one transaction; email counts as
   * verified because Google's strategy rejects unverified accounts.
   *
   * Merge edge case: if an invitation was sent to the same email but
   * never accepted, mark it ACCEPTED (acceptedVia: 'google') so the
   * reminder cron doesn't later nudge a user who already has access.
   */
  async provisionViaGoogleSignup(profile: {
    providerAccountId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<{ accessToken: string; refreshToken: string; user: AcademyAuthUserShape }> {
    const normalizedEmail = profile.email.toLowerCase();
    const displayName =
      [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() ||
      normalizedEmail.split('@')[0];

    const result = await this.prisma.$transaction(async (tx) => {
      // Email collision: if the email already has an academy account,
      // that account owns the inbox — we don't let a Google sign-up
      // silently link to it (the user would still need to prove
      // control of the password path). Fail and prompt them to sign in.
      const existing = await tx.academyUser.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (existing) {
        throw new ForbiddenException({
          message:
            'An academy account already exists for this email. Sign in instead.',
          code: 'EMAIL_EXISTS',
        });
      }

      const user = await tx.academyUser.create({
        data: {
          email: normalizedEmail,
          name: displayName,
          // Google email is pre-verified (strategy rejects unverified).
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
        select: { id: true, email: true, name: true },
      });

      await tx.academyUserIdentity.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerAccountId: profile.providerAccountId,
          email: normalizedEmail,
          emailVerified: true,
        },
      });

      await tx.academyEnrollment.create({
        data: {
          userId: user.id,
          courseId: null,
          grantedById: null,
        },
      });

      // Merge: any pending invitation for this email is now moot.
      await tx.academyInvitation.updateMany({
        where: {
          email: normalizedEmail,
          status: 'PENDING',
        },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedVia: 'google',
          acceptedUserId: user.id,
        },
      });

      return user;
    });

    this.metrics.academyRegistrations.inc({ outcome: 'verified' });
    void this.auditService.record({
      actorId: result.id,
      action: 'academy-user.google-signup',
      resource: 'AcademyUser',
      resourceId: result.id,
    });
    return this.generateTokens(this.shape(result));
  }

  private shape(user: {
    id: string;
    email: string;
    name: string;
  }): AcademyAuthUserShape {
    return { id: user.id, email: user.email, name: user.name };
  }

  private generateTokens(user: AcademyAuthUserShape) {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        realm: 'academy' as const,
      },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
      },
    );
    const jti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh', jti, realm: 'academy' as const },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
      },
    );
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}

/**
 * Extract the email's domain for structured-log payloads — keeps the PII
 * (local part) out of the log stream while keeping aggregation utility
 * (delivery rate by domain, etc.).
 */
function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : 'unknown';
}
