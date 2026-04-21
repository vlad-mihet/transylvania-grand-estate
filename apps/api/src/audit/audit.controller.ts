import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/user.decorator';
import { AuditService } from './audit.service';
import { AuditHealthService } from './audit.health';

/**
 * Read surface for `audit_logs`.
 *
 *   GET /audit-logs                      — firehose (role-scoped)
 *   GET /audit-logs/health               — failure counter (SUPER_ADMIN)
 *   GET /audit-logs/export               — streamed CSV (SUPER_ADMIN)
 *   GET /audit-logs/by-entity/:resource/:id — per-entity timeline
 *
 * Role enforcement happens in two layers:
 *   1. @Roles() restricts who can hit the endpoint at all.
 *   2. AuditService.buildScopeWhere() filters rows further by role so an
 *      ADMIN never sees AdminUser security events, an EDITOR is content-
 *      only, and an AGENT only sees their own actions + properties they own.
 */
@ApiTags('Audit')
@Controller('audit-logs')
export class AuditController {
  constructor(
    private auditService: AuditService,
    private auditHealth: AuditHealthService,
  ) {}

  @Roles(
    AdminRole.SUPER_ADMIN,
    AdminRole.ADMIN,
    AdminRole.EDITOR,
    AdminRole.AGENT,
  )
  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserPayload | null,
    @Query('resource') resource?: string,
    @Query('resourceId') resourceId?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('brand') brand?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!user) return { data: [], meta: { total: 0, page: 1, limit: 20 } };
    return this.auditService.findAll({
      resource,
      resourceId,
      actorId,
      action,
      brand,
      search,
      page,
      limit,
      scopeUser: user,
    });
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Get('health')
  async health() {
    return this.auditHealth.snapshot();
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Get('export')
  async export(
    @CurrentUser() user: CurrentUserPayload | null,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    if (!user) {
      res.status(403).end();
      return;
    }
    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    const header = [
      'id',
      'createdAt',
      'actorId',
      'actorEmail',
      'actorName',
      'action',
      'resource',
      'resourceId',
      'brand',
      'method',
      'url',
      'requestId',
    ];
    res.write(header.join(',') + '\n');

    for await (const batch of this.auditService.streamForExport(user)) {
      for (const row of batch) {
        const line = [
          row.id,
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : row.createdAt,
          row.actorId ?? '',
          row.actor?.email ?? '',
          row.actor?.name ?? '',
          row.action,
          row.resource,
          row.resourceId,
          row.brand ?? '',
          row.method ?? '',
          row.url ?? '',
          row.requestId ?? '',
        ]
          .map(csvCell)
          .join(',');
        res.write(line + '\n');
      }
    }
    res.end();
  }

  @Roles(
    AdminRole.SUPER_ADMIN,
    AdminRole.ADMIN,
    AdminRole.EDITOR,
    AdminRole.AGENT,
  )
  @Get('by-entity/:resource/:id')
  async byEntity(
    @CurrentUser() user: CurrentUserPayload | null,
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!user) return { data: [], meta: { total: 0, page: 1, limit: 50 } };
    return this.auditService.findByEntity({
      resource,
      resourceId: id,
      scopeUser: user,
      page,
      limit,
    });
  }
}

/**
 * Minimal RFC 4180 escaping. Quotes-wrap any cell containing `,`, `"`, or
 * a newline; doubles embedded quotes. Inputs are always strings/numbers/
 * dates by construction (see callers above), so we don't need to handle
 * nested objects.
 */
function csvCell(value: unknown): string {
  const s =
    value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
