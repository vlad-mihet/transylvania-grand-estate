import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * Shape returned by every auth endpoint and used to hydrate JWT payloads.
 * Keep in sync with `CurrentUserPayload` in `common/decorators/user.decorator.ts`
 * and `AuthUser` on the admin side.
 */
interface AuthUserShape {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  agentId: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
      include: { agent: { select: { id: true } } },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // SSO-only users (accepted invite via Google) have no local password.
    // 403 distinguishes "wrong method" from "wrong credentials" so the admin
    // UI can prompt "Continue with Google" instead of a generic failure. The
    // info-leak risk is minimal: admin is invite-only, email list is curated.
    if (!user.passwordHash) {
      throw new ForbiddenException({
        message: 'This account signs in with Google',
        code: 'USE_SSO',
      });
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    // Audit the sign-in \u2014 compliance asks "when did this user last log in"
    // often enough to justify the row. Failed attempts intentionally skipped:
    // at scale they'd flood the table, and per-IP throttling already gives
    // us visibility without an audit row per rejection.
    void this.auditService.record({
      actorId: user.id,
      action: 'user.login-password',
      resource: 'AdminUser',
      resourceId: user.id,
    });

    return this.generateTokens(this.shape(user));
  }

  async refresh(userId: string, previousJti: string | null) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      include: { agent: { select: { id: true } } },
    });
    if (!user) throw new UnauthorizedException('User not found');

    // Single-use rotation: the just-validated jti is added to the denylist
    // before the new pair is minted. A stolen refresh token can be replayed
    // at most once before the legitimate user's next refresh kills it (and
    // vice versa — if the attacker refreshes first, the legitimate user's
    // next refresh fails, surfacing the compromise).
    if (previousJti) {
      await this.revokeRefreshToken(previousJti, user.id, 'forced');
    }

    return this.generateTokens(this.shape(user));
  }

  async register(dto: RegisterDto) {
    const role = dto.role ?? AdminRole.EDITOR;

    if (role === AdminRole.AGENT) {
      if (!dto.agentId) {
        throw new ConflictException(
          'agentId is required when registering an AGENT user',
        );
      }
      const target = await this.prisma.agent.findUnique({
        where: { id: dto.agentId },
        select: { id: true, adminUserId: true },
      });
      if (!target) throw new NotFoundException('Agent not found');
      if (target.adminUserId) {
        throw new ConflictException(
          'Agent is already linked to another admin user',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Transaction so partial failure doesn't leave an orphaned AdminUser.
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.adminUser.create({
        data: {
          email: dto.email,
          passwordHash: hashedPassword,
          name: dto.name,
          role,
        },
      });
      if (role === AdminRole.AGENT && dto.agentId) {
        await tx.agent.update({
          where: { id: dto.agentId },
          data: { adminUserId: created.id },
        });
      }
      return created;
    });

    const withAgent = await this.prisma.adminUser.findUnique({
      where: { id: user.id },
      include: { agent: { select: { id: true } } },
    });
    return this.shape(withAgent!);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      include: { agent: { select: { id: true } } },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.shape(user);
  }

  /**
   * List all admin users. Called from the admin UI's SUPER_ADMIN-only Users
   * page. Returns safe fields only — `passwordHash` is never shaped out.
   */
  async listUsers() {
    const rows = await this.prisma.adminUser.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      include: { agent: { select: { id: true } } },
    });
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      agentId: u.agent?.id ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  /**
   * Update an admin user's name, role, and/or agent linkage. Safety rails:
   * - A SUPER_ADMIN can't demote themselves (leaves no one to rescue the account).
   * - Setting role to AGENT requires linking an unlinked Agent.
   * - Changing role away from AGENT nulls out the old agent linkage so the
   *   Agent record becomes available to link again.
   */
  async updateUser(actorId: string, targetId: string, dto: UpdateUserDto) {
    const target = await this.prisma.adminUser.findUnique({
      where: { id: targetId },
      include: { agent: { select: { id: true } } },
    });
    if (!target) throw new NotFoundException('User not found');

    if (
      dto.role !== undefined &&
      actorId === targetId &&
      target.role === AdminRole.SUPER_ADMIN &&
      dto.role !== AdminRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'You cannot demote yourself from SUPER_ADMIN',
      );
    }

    const nextRole = dto.role ?? target.role;
    const currentAgentId = target.agent?.id ?? null;

    // Resolve the final agent linkage. `dto.agentId === null` means explicit
    // unlink; `undefined` means unchanged.
    let nextAgentId: string | null | undefined = undefined;
    if (dto.agentId !== undefined) nextAgentId = dto.agentId;

    if (nextRole === AdminRole.AGENT) {
      const desired =
        nextAgentId === undefined ? currentAgentId : nextAgentId;
      if (!desired) {
        throw new ConflictException(
          'AGENT role requires a linked agent — pass agentId',
        );
      }
      if (desired !== currentAgentId) {
        // Verify desired agent is unlinked (or linked to this same user).
        const targetAgent = await this.prisma.agent.findUnique({
          where: { id: desired },
          select: { id: true, adminUserId: true },
        });
        if (!targetAgent) throw new NotFoundException('Agent not found');
        if (targetAgent.adminUserId && targetAgent.adminUserId !== targetId) {
          throw new ConflictException(
            'Agent is already linked to another admin user',
          );
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Apply the role/name update first.
      const user = await tx.adminUser.update({
        where: { id: targetId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.role !== undefined ? { role: dto.role } : {}),
        },
      });

      // Then reconcile agent linkage.
      if (nextRole !== AdminRole.AGENT && currentAgentId) {
        // Role moved away from AGENT — detach the old link.
        await tx.agent.update({
          where: { id: currentAgentId },
          data: { adminUserId: null },
        });
      } else if (nextRole === AdminRole.AGENT) {
        const desired =
          nextAgentId === undefined ? currentAgentId : nextAgentId;
        if (desired && desired !== currentAgentId) {
          // Clear any previous link from this user (if role was already AGENT
          // with a different agent) then connect the new one.
          if (currentAgentId) {
            await tx.agent.update({
              where: { id: currentAgentId },
              data: { adminUserId: null },
            });
          }
          await tx.agent.update({
            where: { id: desired },
            data: { adminUserId: user.id },
          });
        }
      }

      return tx.adminUser.findUniqueOrThrow({
        where: { id: targetId },
        include: { agent: { select: { id: true } } },
      });
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      agentId: updated.agent?.id ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete an admin user. Safety: a user cannot delete themselves (would
   * lock them out of the admin surface mid-session). Last SUPER_ADMIN
   * cannot be deleted either — same rescue rationale as demotion. Linked
   * Agent rows survive via onDelete: SetNull in the FK definition.
   */
  async deleteUser(actorId: string, targetId: string) {
    if (actorId === targetId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const target = await this.prisma.adminUser.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException('User not found');

    if (target.role === AdminRole.SUPER_ADMIN) {
      const superAdminCount = await this.prisma.adminUser.count({
        where: { role: AdminRole.SUPER_ADMIN },
      });
      if (superAdminCount <= 1) {
        throw new ConflictException(
          'Cannot delete the last SUPER_ADMIN account',
        );
      }
    }

    await this.prisma.adminUser.delete({ where: { id: targetId } });
    return { success: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('User not found');

    // SSO-only accounts have no password to change. Setting a first-time
    // password from this endpoint would skip the currentPassword check, so
    // a dedicated "set password" flow belongs in a follow-up.
    if (!user.passwordHash) {
      throw new ForbiddenException({
        message:
          'This account has no password set — sign in with Google, or ask an admin to set one.',
        code: 'NO_PASSWORD',
      });
    }

    const passwordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!passwordValid)
      throw new UnauthorizedException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.adminUser.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Revoke a specific refresh token's jti. Idempotent \u2014 repeat calls with
   * the same jti are upserted as no-ops. Called by /auth/logout with the
   * jti freshly decoded from the cookie's refresh token, and by user-delete.
   */
  async revokeRefreshToken(
    jti: string,
    adminUserId: string,
    reason: 'logout' | 'user_deleted' | 'forced',
  ): Promise<void> {
    if (!jti) return;
    await this.prisma.revokedToken.upsert({
      where: { jti },
      create: { jti, adminUserId, reason },
      update: {},
    });
  }

  /** Public check used by the refresh strategy. */
  async isRefreshTokenRevoked(jti: string): Promise<boolean> {
    if (!jti) return false;
    const hit = await this.prisma.revokedToken.findUnique({
      where: { jti },
      select: { jti: true },
    });
    return hit !== null;
  }

  /**
   * Daily purge of denylist rows past the refresh expiry window. Once the
   * underlying JWT has expired, passport-jwt rejects on `exp` first, so the
   * denylist row is moot. Cap retention at 30 days so the table doesn't
   * grow without bound even with heavy session churn.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeRevokedTokens(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.prisma.revokedToken.deleteMany({
      where: { revokedAt: { lt: cutoff } },
    });
  }

  /**
   * Issue a fresh access+refresh token pair for a user by ID. Public because
   * the invitations flow (accept-with-password + OAuth callback) need to
   * mint tokens after creating the AdminUser, without duplicating the
   * shape + sign logic kept private here.
   */
  async issueTokensForUserId(userId: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      include: { agent: { select: { id: true } } },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.generateTokens(this.shape(user));
  }

  /**
   * Google sign-in for a returning user. Looks up the OAuthIdentity by
   * provider + Google sub. We deliberately DO NOT fall back to email lookup
   * here — email-to-identity binding only happens during invitation accept.
   * An unknown Google account surfacing at /auth/google means either
   * (a) the user hasn't been invited yet, or (b) they revoked the link; in
   * both cases, an admin needs to issue a fresh invitation.
   */
  async signInWithGoogle(profile: { providerAccountId: string; email: string }) {
    const identity = await this.prisma.oAuthIdentity.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'GOOGLE',
          providerAccountId: profile.providerAccountId,
        },
      },
      select: { adminUserId: true },
    });
    if (!identity) {
      throw new UnauthorizedException({
        message: 'No account linked to this Google identity',
        code: 'NO_ACCOUNT',
      });
    }
    return this.issueTokensForUserId(identity.adminUserId);
  }

  private shape(user: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
    agent?: { id: string } | null;
  }): AuthUserShape {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      agentId: user.agent?.id ?? null,
    };
  }

  private generateTokens(user: AuthUserShape) {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        agentId: user.agentId,
        // Explicit realm lets the academy surface reject admin tokens (and
        // vice versa) without inspecting role or email. Legacy tokens minted
        // before this rollout carry no realm and default to 'admin' on the
        // consuming side.
        realm: 'admin' as const,
      },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
      },
    );
    // jti enables targeted revocation: logout, user-delete, and forced
    // sign-out all work by inserting this value into `revoked_tokens`. The
    // refresh strategy rejects any token whose jti is in the denylist.
    const jti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh', jti },
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
        role: user.role,
        agentId: user.agentId,
      },
    };
  }
}
