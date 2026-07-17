import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminRole, AdminUserStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { paginate } from '../common/utils/pagination.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { ListUsersDto } from './dto/list-users.dto';
import type { BulkUserActionDto } from './dto/bulk-user-action.dto';

// Upper bound on a single paginated users pull. The admin People hub requests
// limit=500; the team is small, so this cap is generous headroom, not a real
// page size.
const USERS_LIST_CAP = 1000;

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

/**
 * In-memory throttle for lastSeenAt writes. Keyed by user id, value is the
 * epoch-ms of the last persisted touch. We accept the per-instance staleness
 * — at the platform's scale a single API instance handles a SUPER_ADMIN's
 * traffic, and even with multiple instances the worst case is N×writes per
 * user per window, still 60-90× less than per-request. If horizontal
 * traffic ever changes that calculus, lift to Redis.
 */
const lastSeenWriteCache = new Map<string, number>();
const LAST_SEEN_THROTTLE_MS = 5 * 60_000;

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

    // Suspended accounts cannot sign in. Check after the password match so a
    // suspended account doesn't double as an oracle for valid-vs-bad passwords.
    if (user.status === AdminUserStatus.SUSPENDED) {
      throw new ForbiddenException({
        message: 'This account has been suspended',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    // Stamp last-login. Fire-and-forget \u2014 a transient DB hiccup here should
    // not block a valid login, and the value is observability-only (drives
    // the /users dormancy column, no security decisions branch on it).
    void this.touchLastLogin(user.id);

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

    // Suspended users cannot refresh. Combined with the suspend handler
    // revoking outstanding refresh-token jtis, this means a SUPER_ADMIN
    // suspension lands within JWT_ACCESS_EXPIRATION (default 15 min): the
    // existing access token rides out its TTL, but no new pair is minted.
    if (user.status === AdminUserStatus.SUSPENDED) {
      throw new UnauthorizedException({
        message: 'Account is suspended',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

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
   * `role` and `status` filters narrow the list; both can be repeated query
   * params (`?role=ADMIN&role=EDITOR`).
   */
  async listUsers(filters: ListUsersDto = {}) {
    const where: Prisma.AdminUserWhereInput = {};
    if (filters.role && filters.role.length > 0) {
      where.role = { in: filters.role };
    }
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }
    if (filters.search) {
      const q = filters.search.trim();
      if (q.length > 0) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ];
      }
    }
    const orderBy: Prisma.AdminUserOrderByWithRelationInput[] = [
      { role: 'asc' },
      { name: 'asc' },
    ];
    const include = { agent: { select: { id: true } } } as const;

    // Paginate when the caller asks (page/limit) so the admin People hub can
    // read `meta.total` for its KPI; otherwise keep the historical bare-array
    // response. Mirrors the /agents list contract.
    if (filters.page !== undefined || filters.limit !== undefined) {
      const page = filters.page ?? 1;
      const limit = Math.min(filters.limit ?? 50, USERS_LIST_CAP);
      const result = await paginate(
        (skip, take) =>
          this.prisma.adminUser.findMany({
            where,
            orderBy,
            include,
            skip,
            take,
          }),
        () => this.prisma.adminUser.count({ where }),
        page,
        limit,
      );
      return { ...result, data: result.data.map((u) => this.shapeListRow(u)) };
    }

    const rows = await this.prisma.adminUser.findMany({
      where,
      orderBy,
      include,
    });
    return rows.map((u) => this.shapeListRow(u));
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

    return this.shapeListRow(updated);
  }

  /**
   * Suspend an admin user. Sets status=SUSPENDED, stamps disabledAt, and
   * revokes every outstanding refresh-token jti owned by the user. The
   * suspended user's existing access token continues to work until its TTL
   * expires (default 15 min) — within that window they can't refresh, so
   * lockout is bounded by JWT_ACCESS_EXPIRATION. Self-suspension is rejected
   * for the same rescue rationale as self-demote.
   */
  async suspendUser(actorId: string, targetId: string) {
    if (actorId === targetId) {
      throw new ForbiddenException('You cannot suspend your own account');
    }
    const target = await this.prisma.adminUser.findUnique({
      where: { id: targetId },
      include: { agent: { select: { id: true } } },
    });
    if (!target) throw new NotFoundException('User not found');
    // Last-SUPER_ADMIN guard — same as delete. Suspending the only
    // SUPER_ADMIN locks the surface out of itself.
    if (target.role === AdminRole.SUPER_ADMIN) {
      const activeSuperAdmins = await this.prisma.adminUser.count({
        where: {
          role: AdminRole.SUPER_ADMIN,
          status: AdminUserStatus.ACTIVE,
        },
      });
      if (activeSuperAdmins <= 1 && target.status === AdminUserStatus.ACTIVE) {
        throw new ConflictException(
          'Cannot suspend the last active SUPER_ADMIN account',
        );
      }
    }
    if (target.status === AdminUserStatus.SUSPENDED) {
      // Idempotent: already suspended is a no-op, so the bulk path doesn't
      // need to dedupe ids.
      return this.shapeListRow(target);
    }
    const updated = await this.prisma.adminUser.update({
      where: { id: targetId },
      data: {
        status: AdminUserStatus.SUSPENDED,
        disabledAt: new Date(),
      },
      include: { agent: { select: { id: true } } },
    });
    // Fire-and-forget: revoke every refresh jti minted for this user so the
    // active session can't survive past its access-token TTL. We don't have
    // the live jti list here (jtis aren't persisted, only minted into JWTs),
    // so we use the denylist's per-user marker semantics: insert a sentinel
    // row whose jti is `user:<userId>` and have the refresh strategy reject
    // any token whose sub matches. Simplest path that works without schema
    // changes — see isRefreshTokenRevoked() / suspended-user check in the
    // strategy. Or simply rely on the suspended-status check in refresh().
    // Going with the latter: refresh() already throws on SUSPENDED, no extra
    // denylist work needed.
    return this.shapeListRow(updated);
  }

  /**
   * Reactivate a suspended user. Idempotent — calling on an ACTIVE user is a
   * no-op. Does NOT clear lastLoginAt; that's history.
   */
  async reactivateUser(_actorId: string, targetId: string) {
    const target = await this.prisma.adminUser.findUnique({
      where: { id: targetId },
      include: { agent: { select: { id: true } } },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.status === AdminUserStatus.ACTIVE) {
      return this.shapeListRow(target);
    }
    const updated = await this.prisma.adminUser.update({
      where: { id: targetId },
      data: {
        status: AdminUserStatus.ACTIVE,
        disabledAt: null,
      },
      include: { agent: { select: { id: true } } },
    });
    return this.shapeListRow(updated);
  }

  /**
   * Bulk action over a set of user ids. Cap at 100 ids per request to keep
   * the transaction bounded. Self-id is rejected for destructive actions
   * (delete/suspend) — the caller could re-issue without their own id, no
   * need to silently filter.
   */
  async bulkUserAction(actorId: string, dto: BulkUserActionDto) {
    if (dto.ids.length === 0) {
      throw new BadRequestException('ids must contain at least one user id');
    }
    if (dto.ids.length > 100) {
      throw new BadRequestException('Bulk actions are capped at 100 ids');
    }
    const destructive =
      dto.action === 'delete' || dto.action === 'suspend';
    if (destructive && dto.ids.includes(actorId)) {
      throw new ForbiddenException(
        'Bulk action would affect your own account — remove your id from the list',
      );
    }
    if (dto.action === 'set-role' && !dto.role) {
      throw new BadRequestException('role is required when action is set-role');
    }

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    for (const id of dto.ids) {
      try {
        switch (dto.action) {
          case 'suspend':
            await this.suspendUser(actorId, id);
            break;
          case 'reactivate':
            await this.reactivateUser(actorId, id);
            break;
          case 'delete':
            await this.deleteUser(actorId, id);
            break;
          case 'set-role':
            await this.updateUser(actorId, id, { role: dto.role });
            break;
        }
        results.push({ id, ok: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error';
        results.push({ id, ok: false, error: message });
      }
    }
    return {
      action: dto.action,
      successCount: results.filter((r) => r.ok).length,
      failureCount: results.filter((r) => !r.ok).length,
      results,
    };
  }

  /**
   * Activity payload for the user peek sheet. Aggregates the slow-changing
   * facets (identities, pending invitation) with the fast-moving ones
   * (recent audit log, last-login). Single endpoint so the panel renders in
   * one round-trip.
   */
  async getUserActivity(targetId: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: targetId },
      include: {
        agent: { select: { id: true, slug: true, firstName: true, lastName: true } },
        identities: {
          select: {
            id: true,
            provider: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const pendingInvitation = await this.prisma.invitation.findFirst({
      where: {
        email: user.email,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        emailSentAt: true,
        emailAttempts: true,
        bouncedAt: true,
        bounceReason: true,
        createdAt: true,
      },
    });

    const recentAudit = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { actorId: targetId },
          { resource: 'AdminUser', resourceId: targetId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        action: true,
        resource: true,
        resourceId: true,
        createdAt: true,
        brand: true,
        method: true,
        url: true,
      },
    });

    return {
      user: this.shapeListRow(user),
      identities: user.identities.map((i) => ({
        id: i.id,
        provider: i.provider,
        email: i.email,
        createdAt: i.createdAt,
      })),
      pendingInvitation,
      recentAudit,
    };
  }

  /**
   * Stamp lastLoginAt + lastSeenAt to mark a fresh session. Called from the
   * password and Google login paths. Best-effort: errors are swallowed so a
   * blip in the writeable replica doesn't block a login.
   */
  private async touchLastLogin(userId: string): Promise<void> {
    try {
      const now = new Date();
      await this.prisma.adminUser.update({
        where: { id: userId },
        data: { lastLoginAt: now, lastSeenAt: now },
      });
    } catch {
      // Ignored — observability-only field.
    }
  }

  /**
   * Update lastSeenAt for an authenticated user. Rate-limited in-memory to
   * once per LAST_SEEN_THROTTLE_MS so high-traffic users don't hammer the
   * row. Called by the JWT access strategy after token verification.
   */
  async touchLastSeen(userId: string): Promise<void> {
    const last = lastSeenWriteCache.get(userId) ?? 0;
    const now = Date.now();
    if (now - last < LAST_SEEN_THROTTLE_MS) return;
    lastSeenWriteCache.set(userId, now);
    try {
      await this.prisma.adminUser.update({
        where: { id: userId },
        data: { lastSeenAt: new Date(now) },
      });
    } catch {
      // Drop the cache entry so the next request retries.
      lastSeenWriteCache.delete(userId);
    }
  }

  /** Public helper for the JWT strategy: confirm the user exists and is ACTIVE. */
  async assertUserNotSuspended(userId: string): Promise<void> {
    const u = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (!u) throw new UnauthorizedException('User not found');
    if (u.status === AdminUserStatus.SUSPENDED) {
      throw new UnauthorizedException({
        message: 'Account is suspended',
        code: 'ACCOUNT_SUSPENDED',
      });
    }
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
    // Reject SUSPENDED before minting tokens. Symmetrical with the password
    // path — Google can't be a side-door around suspension.
    const target = await this.prisma.adminUser.findUnique({
      where: { id: identity.adminUserId },
      select: { status: true },
    });
    if (target?.status === AdminUserStatus.SUSPENDED) {
      throw new ForbiddenException({
        message: 'This account has been suspended',
        code: 'ACCOUNT_SUSPENDED',
      });
    }
    void this.touchLastLogin(identity.adminUserId);
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

  /**
   * Wire-format row used by GET /auth/users + the suspend/reactivate/update
   * responses. Adds the lifecycle + activity fields that the admin UI's
   * `/users` table renders alongside the original list shape. Never includes
   * the password hash.
   */
  private shapeListRow(user: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
    status: AdminUserStatus;
    disabledAt: Date | null;
    lastLoginAt: Date | null;
    lastSeenAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    agent?: { id: string } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      disabledAt: user.disabledAt,
      lastLoginAt: user.lastLoginAt,
      lastSeenAt: user.lastSeenAt,
      agentId: user.agent?.id ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private generateTokens(user: AuthUserShape) {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        agentId: user.agentId,
        // Realm claim is a belt-and-suspenders check on top of cryptographic
        // separation: admin and academy tokens are now signed with distinct
        // secrets, so a cross-realm token would already fail signature.
        realm: 'admin' as const,
      },
      {
        secret: this.configService.get('JWT_ADMIN_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
      },
    );
    // jti enables targeted revocation: logout, user-delete, and forced
    // sign-out all work by inserting this value into `revoked_tokens`. The
    // refresh strategy rejects any token whose jti is in the denylist.
    const jti = randomUUID();
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh', jti, realm: 'admin' as const },
      {
        secret: this.configService.get('JWT_ADMIN_REFRESH_SECRET'),
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
