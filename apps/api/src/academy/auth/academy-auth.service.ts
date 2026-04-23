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
import { AcademyLoginDto } from './dto/login.dto';
import { AcademyChangePasswordDto } from './dto/change-password.dto';
import type {
  AcademyForgotPasswordDto,
  AcademyResetPasswordDto,
  UpdateAcademyProfileDto,
} from './dto/forgot-password.dto';

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
