import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/utils/pagination.util';
import {
  CLS_REQUEST_CONTEXT,
  RequestContext,
} from '../common/cls/request-context';
import { computeDiff } from './utils/compute-diff';
import { AuditHealthService } from './audit.health';
import { buildScopeWhere } from './audit.scope';
import type { CurrentUserPayload } from '../common/decorators/user.decorator';

export interface AuditRecordInput {
  actorId?: string | null;
  action: string;
  resource: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  /**
   * Optional override of the per-request CLS context. Background jobs
   * spawned outside the request lifecycle pass this when they can't wrap
   * themselves in `cls.run`.
   */
  contextOverride?: Partial<RequestContext>;
  /**
   * Custom retention window. Defaults are per-action-class (see
   * resolveRetention()); pass through when a caller has stricter compliance.
   */
  retainUntil?: Date | null;
}

export interface AuditQuery {
  resource?: string;
  resourceId?: string;
  actorId?: string;
  action?: string;
  brand?: string;
  search?: string;
  page?: number;
  limit?: number;
  /** Reader's role + agentId — drives buildScopeWhere(). */
  scopeUser: CurrentUserPayload;
}

export interface ByEntityQuery {
  resource: string;
  resourceId: string;
  scopeUser: CurrentUserPayload;
  page?: number;
  limit?: number;
}

/**
 * Append-only writer for `audit_logs`. Two entry points:
 *
 *   - `record()`: legacy call shape kept for the AuditInterceptor and the
 *     auth.service login emitter. Treats inputs as authoritative — does NOT
 *     fall back to CLS context (the interceptor merges req.user itself).
 *   - `recordCustom()`: service-layer entry point. Reads forensics fields
 *     from CLS so password-reset / OAuth / future cron jobs don't have to
 *     thread the request object through their service signatures.
 *
 * Both swallow write errors via AuditHealthService.recordFailure — a
 * hiccup in the audit path can't break a real mutation, but the dashboard
 * widget makes the failure visible instead of silent.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private prisma: PrismaService,
    private cls: ClsService,
    private health: AuditHealthService,
  ) {}

  async findAll(query: AuditQuery) {
    const { page = 1, limit = 20 } = query;
    const where: Prisma.AuditLogWhereInput = {};
    if (query.resource) where.resource = query.resource;
    if (query.resourceId) where.resourceId = query.resourceId;
    if (query.actorId) where.actorId = query.actorId;
    if (query.action) where.action = { startsWith: query.action };
    if (query.brand) where.brand = query.brand;
    if (query.search) {
      const s = query.search;
      where.OR = [
        { action: { contains: s, mode: 'insensitive' } },
        { resource: { contains: s, mode: 'insensitive' } },
        { resourceId: { contains: s } },
      ];
    }
    const scopeWhere = await buildScopeWhere(query.scopeUser, this.prisma);
    const finalWhere: Prisma.AuditLogWhereInput = { AND: [where, scopeWhere] };

    return paginate(
      async (skip, take) => {
        const rows = await this.prisma.auditLog.findMany({
          where: finalWhere,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          include: {
            actor: { select: { id: true, email: true, name: true } },
          },
        });
        return rows.map(this.shape);
      },
      () => this.prisma.auditLog.count({ where: finalWhere }),
      page,
      limit,
    );
  }

  async findByEntity(query: ByEntityQuery) {
    const { page = 1, limit = 50 } = query;
    const baseWhere: Prisma.AuditLogWhereInput = {
      resource: query.resource,
      resourceId: query.resourceId,
    };
    const scopeWhere = await buildScopeWhere(query.scopeUser, this.prisma);
    const finalWhere: Prisma.AuditLogWhereInput = {
      AND: [baseWhere, scopeWhere],
    };

    return paginate(
      async (skip, take) => {
        const rows = await this.prisma.auditLog.findMany({
          where: finalWhere,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          include: {
            actor: { select: { id: true, email: true, name: true } },
          },
        });
        return rows.map(this.shape);
      },
      () => this.prisma.auditLog.count({ where: finalWhere }),
      page,
      limit,
    );
  }

  /**
   * Stream audit rows in batches for CSV export. Caller is responsible for
   * formatting + closing the response stream — this just yields batches in
   * descending createdAt order using cursor pagination so memory stays flat
   * regardless of total row count.
   */
  async *streamForExport(scopeUser: CurrentUserPayload, batchSize = 1000) {
    const scopeWhere = await buildScopeWhere(scopeUser, this.prisma);
    let cursor: string | undefined;
    while (true) {
      const rows = await this.prisma.auditLog.findMany({
        where: scopeWhere,
        orderBy: { createdAt: 'desc' },
        take: batchSize,
        ...(cursor
          ? { cursor: { id: cursor }, skip: 1 }
          : {}),
        include: {
          actor: { select: { id: true, email: true, name: true } },
        },
      });
      if (rows.length === 0) break;
      yield rows.map(this.shape);
      if (rows.length < batchSize) break;
      cursor = rows[rows.length - 1].id;
    }
  }

  /**
   * Direct write — used by the AuditInterceptor and the auth-login emitter
   * which already have everything they need from `req`. CLS context is read
   * passively to fill the forensics columns; if it's unavailable (e.g. a
   * test that doesn't mount the CLS module) the write still succeeds with
   * the new columns null.
   */
  async record(input: AuditRecordInput): Promise<void> {
    const ctx = this.readContext(input.contextOverride);
    const diff = computeDiff(input.before, input.after);
    try {
      await this.prisma.auditLog.create({
        data: this.buildData(input, ctx, diff),
      });
    } catch (err) {
      this.recordFailure(input, err);
    }
  }

  /**
   * Service-layer entry point. Same persistence as record() but its purpose
   * is documentation: callers signal "I'm emitting a custom audit because
   * the URL/HTTP shape can't carry the right semantics on its own"
   * (password reset confirmations, OAuth acceptance, scheduled jobs).
   */
  async recordCustom(input: AuditRecordInput): Promise<void> {
    return this.record(input);
  }

  private readContext(
    override?: Partial<RequestContext>,
  ): RequestContext {
    let ctx: RequestContext | undefined;
    try {
      ctx = this.cls.get<RequestContext>(CLS_REQUEST_CONTEXT);
    } catch {
      ctx = undefined;
    }
    return { ...(ctx ?? {}), ...(override ?? {}) };
  }

  private buildData(
    input: AuditRecordInput,
    ctx: RequestContext,
    diff: ReturnType<typeof computeDiff>,
  ): Prisma.AuditLogUncheckedCreateInput {
    const retainUntil =
      input.retainUntil !== undefined
        ? input.retainUntil
        : resolveRetention(input.action);
    return {
      actorId: input.actorId ?? ctx.userId ?? null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      before:
        input.before == null
          ? Prisma.DbNull
          : (input.before as Prisma.InputJsonValue),
      after:
        input.after == null
          ? Prisma.DbNull
          : (input.after as Prisma.InputJsonValue),
      diff:
        diff == null
          ? Prisma.DbNull
          : (diff as unknown as Prisma.InputJsonValue),
      requestId: ctx.requestId ?? null,
      ipHash: ctx.ipHash ?? null,
      userAgent: ctx.userAgent ?? null,
      method: ctx.method ?? null,
      url: ctx.url ?? null,
      // status: handler-specific; the interceptor doesn't have it at write
      // time without an extra hook, so we leave it null for now. Reserved
      // for a future after-response interceptor that captures res.statusCode.
      status: null,
      brand: ctx.brand ?? null,
      retainUntil: retainUntil ?? null,
    };
  }

  private recordFailure(input: AuditRecordInput, err: unknown): void {
    this.health.recordFailure(err);
    this.logger.warn(
      {
        err,
        audit: {
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
        },
      },
      'audit_write_failed',
    );
  }

  private shape = (row: {
    id: string;
    actorId: string | null;
    actor: { id: string; email: string; name: string | null } | null;
    action: string;
    resource: string;
    resourceId: string;
    diff: Prisma.JsonValue | null;
    before: Prisma.JsonValue | null;
    after: Prisma.JsonValue | null;
    requestId: string | null;
    brand: string | null;
    method: string | null;
    url: string | null;
    createdAt: Date;
  }) => ({
    id: row.id,
    actorId: row.actorId,
    actor: row.actor,
    action: row.action,
    resource: row.resource,
    resourceId: row.resourceId,
    diff: row.diff,
    before: row.before,
    after: row.after,
    requestId: row.requestId,
    brand: row.brand,
    method: row.method,
    url: row.url,
    createdAt: row.createdAt,
  });
}

/**
 * Retention default by action prefix. Auth + user lifecycle events get the
 * longest window because compliance asks for them; content edits get a
 * shorter default because they can be reconstructed from git/Prisma history
 * if needed. `null` means "keep forever" — used for nothing today, but
 * AuditService.record honours an explicit override.
 */
function resolveRetention(action: string): Date | null {
  const now = Date.now();
  const years = (n: number) => new Date(now + n * 365 * 24 * 60 * 60 * 1000);
  if (action.startsWith('auth.')) return years(7);
  if (action.startsWith('user.')) return years(3);
  if (action.startsWith('invitation.')) return years(3);
  if (action.startsWith('site-config.')) return years(3);
  if (action.startsWith('property.')) return years(2);
  return years(1);
}
