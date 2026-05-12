import { Injectable } from '@nestjs/common';
import {
  AdminRole,
  AdminUserStatus,
  ArticleStatus,
  InquiryStatus,
  InvitationStatus,
} from '@prisma/client';
import type { DashboardAttention } from '@tge/types/schemas/dashboard';

import { PrismaService } from '../../prisma/prisma.service';
import { AuditHealthService } from '../../audit/audit.health';
import { AdminContentService } from '../content/admin-content.service';

/**
 * Composes the "What needs attention" tile counts for the admin Dashboard.
 * Replaces 6 separate front-end fanout queries with a single round-trip.
 *
 * Per-field gating mirrors the front-end role/capability matrix in
 * `apps/admin/src/lib/permissions.ts`:
 *  - newInquiries / draftArticles / missingEnTotal — every admin role
 *  - pendingAcademyInvitations — ADMIN, SUPER_ADMIN
 *  - suspendedUsers / auditFailuresSinceBoot — SUPER_ADMIN
 *
 * Forbidden fields are returned as `null` rather than omitted so the wire
 * shape is stable and the front-end can iterate over present-but-null vs
 * present-with-value uniformly.
 */
@Injectable()
export class AdminDashboardService {
  constructor(
    private prisma: PrismaService,
    private adminContent: AdminContentService,
    private auditHealth: AuditHealthService,
  ) {}

  async getAttention(role: AdminRole): Promise<DashboardAttention> {
    const isAdminPlus =
      role === AdminRole.ADMIN || role === AdminRole.SUPER_ADMIN;
    const isSuperAdmin = role === AdminRole.SUPER_ADMIN;

    // Run independent counts in parallel. localeCompleteness is the heaviest
    // call (8 findMany scans) but it's the same query the Content home runs,
    // so React Query will dedupe on the client when both pages are open.
    const [
      newInquiries,
      draftArticles,
      contentSummary,
      pendingAcademyInvitations,
      suspendedUsers,
    ] = await Promise.all([
      this.prisma.inquiry.count({ where: { status: InquiryStatus.new } }),
      this.prisma.article.count({
        where: { status: ArticleStatus.draft },
      }),
      this.adminContent.localeCompleteness(),
      isAdminPlus
        ? this.prisma.academyInvitation.count({
            where: { status: InvitationStatus.PENDING },
          })
        : Promise.resolve(null),
      isSuperAdmin
        ? this.prisma.adminUser.count({
            where: {
              OR: [
                { status: AdminUserStatus.SUSPENDED },
                { disabledAt: { not: null } },
              ],
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      newInquiries,
      draftArticles,
      missingEnTotal: contentSummary.missingEnTotal,
      pendingAcademyInvitations,
      suspendedUsers,
      auditFailuresSinceBoot: isSuperAdmin
        ? this.auditHealth.snapshot().failuresSinceBoot
        : null,
    };
  }
}
