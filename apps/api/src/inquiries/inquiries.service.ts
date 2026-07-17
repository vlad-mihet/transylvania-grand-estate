import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { MetricsService } from '../metrics/metrics.service';
import { Sentry } from '../common/sentry/sentry.init';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { QueryInquiryDto } from './dto/query-inquiry.dto';
import { UpdateInquiryStatusDto } from './dto/update-inquiry-status.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { paginate } from '../common/utils/pagination.util';
import { ensureFound } from '../common/utils/ensure-found.util';
import { ensureRef } from '../common/utils/ensure-ref.util';
import { withAdvisoryLock } from '../common/utils/advisory-lock.util';
import { SiteId, type SiteContext } from '../common/site/site.types';
import type { CurrentUserPayload } from '../common/decorators/user.decorator';
import type { InquirySubmitterLocale } from '../email/templates/inquiry-submitter-confirmation.template';

const SUBMITTER_LOCALES: ReadonlySet<InquirySubmitterLocale> = new Set([
  'en',
  'ro',
  'fr',
  'de',
]);

/**
 * SiteId → originating-app code stored in `inquiry.app`. Drives the unified
 * admin queue's source filter chips. Kept separate from the SiteId enum so a
 * future split (e.g. Reveria spawning its own iOS app) doesn't conflate the
 * two dimensions.
 */
const SITE_TO_APP: Record<SiteId, 'landing' | 'revery' | 'academy' | 'admin' | null> = {
  [SiteId.TGE_LUXURY]: 'landing',
  [SiteId.REVERY]: 'revery',
  [SiteId.ACADEMY]: 'academy',
  [SiteId.ADMIN]: 'admin',
  [SiteId.UNKNOWN]: null,
};

/**
 * Public sites that are valid for stamping on a new inquiry. UNKNOWN/ADMIN
 * are treated as "couldn't determine" and fall back to TGE_LUXURY (the
 * historic default for legacy rows).
 */
const PUBLIC_SITE_IDS: ReadonlySet<SiteId> = new Set([
  SiteId.TGE_LUXURY,
  SiteId.REVERY,
  SiteId.ACADEMY,
]);

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
    private metrics: MetricsService,
  ) {}

  async create(dto: CreateInquiryDto, site: SiteContext) {
    // Honeypot trap. The hidden `website` field is invisible to humans;
    // bots auto-filling every input land here. We log the hit, skip
    // persistence + emails, and return a fabricated success shape so the
    // bot can't probe for "did the trap fire?" by comparing responses.
    if (typeof dto.website === 'string' && dto.website.length > 0) {
      this.logger.warn({
        event: 'inquiry.honeypot.triggered',
        siteId: site.id,
        source: dto.source,
        sourceUrl: dto.sourceUrl,
        // Don't log the bot's full payload — could be huge / abusive.
        websiteLength: dto.website.length,
      });
      this.metrics.inquiriesHoneypotTriggered.inc({ siteId: site.id });
      this.metrics.inquiriesSubmitted.inc({
        siteId: site.id,
        app: SITE_TO_APP[site.id] ?? 'unknown',
        result: 'honeypot',
      });
      // Structured breadcrumb so a Sentry issue (e.g. a downstream exception
      // a few seconds later) carries the trap context. Not an exception
      // itself — bots tripping the honeypot is expected steady-state noise.
      Sentry.addBreadcrumb({
        category: 'inquiry.security',
        level: 'warning',
        message: 'honeypot.triggered',
        data: {
          siteId: site.id,
          source: dto.source ?? null,
          sourceUrl: dto.sourceUrl ?? null,
        },
      });
      return {
        id: '00000000-0000-0000-0000-000000000000',
        type: dto.type ?? 'general',
        status: 'new',
        createdAt: new Date(),
      };
    }

    await ensureRef(dto.propertySlug, 'propertySlug', (slug) =>
      this.prisma.property.findUnique({
        where: { slug },
        select: { id: true },
      }),
    );

    // siteId stamped server-side from SiteMiddleware so admin queries can
    // scope by brand without trusting the client `source` string. UNKNOWN
    // (no Origin/X-Site/Referer) clamps to TGE_LUXURY — the historic default
    // for orphan rows. The `app` column mirrors the originating surface for
    // the admin queue's filter chips.
    const stampedSiteId: SiteId = PUBLIC_SITE_IDS.has(site.id)
      ? site.id
      : SiteId.TGE_LUXURY;
    const stampedApp = SITE_TO_APP[stampedSiteId];

    // Locale capture. PR 4a: client may or may not send `dto.locale` (rolling
    // deploy window — older clients still in flight). When absent, derive
    // from the sourceUrl regex as a defensive fallback so the row is never
    // saved with a NULL locale. PR 4c will require `dto.locale` at the schema
    // level and drop the regex.
    const submitterLocale =
      (dto.locale as InquirySubmitterLocale | undefined) ??
      this.deriveSubmitterLocale(dto.sourceUrl);

    // Server stamps `consentedAt` so the timestamp can't be backdated by a
    // tampered client; `gdprConsent: true` is enforced by the Zod DTO.
    const inquiry = await this.prisma.inquiry.create({
      data: {
        type: dto.type ?? 'general',
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
        entityName: dto.entityName,
        entitySlug: dto.entitySlug,
        budget: dto.budget,
        propertySlug: dto.propertySlug,
        source: dto.source,
        sourceUrl: dto.sourceUrl,
        gdprConsentVersion: dto.gdprConsentVersion,
        marketingConsent: dto.marketingConsent ?? false,
        consentedAt: new Date(),
        siteId: stampedSiteId,
        app: stampedApp,
        locale: submitterLocale,
      },
    });

    this.metrics.inquiriesSubmitted.inc({
      siteId: stampedSiteId,
      app: stampedApp ?? 'unknown',
      result: 'success',
    });

    // Fire-and-forget the two notifications. Email failures must never break
    // the HTTP response — the inquiry is already persisted, the operator can
    // discover it via the admin queue even if Resend is down.
    void this.dispatchInquiryEmails(inquiry, dto);

    return inquiry;
  }

  private async dispatchInquiryEmails(
    inquiry: { id: string; createdAt: Date; type: string; locale: string | null },
    dto: CreateInquiryDto,
  ): Promise<void> {
    // Read from the persisted column first; fall back to the regex helper
    // for rows mid-flight on rolling deploys. PR 4c drops the fallback.
    const submitterLocale = this.normalizeSubmitterLocale(
      inquiry.locale ?? dto.locale ?? this.deriveSubmitterLocale(dto.sourceUrl),
    );
    const brandName = this.deriveBrandName(dto.source);
    const adminUrl = this.buildAdminUrl(inquiry.id);
    const adminRecipients = this.config.get<string>('INQUIRIES_NOTIFY_TO');

    const tasks: Array<Promise<unknown>> = [];

    tasks.push(
      this.email
        .sendInquirySubmitterConfirmation(dto.email, {
          submitterName: dto.name,
          brandName,
          message: dto.message,
          entityName: dto.entityName,
          locale: submitterLocale,
        })
        .catch((err) => {
          this.logger.error({
            event: 'inquiry.confirmation.threw',
            inquiryId: inquiry.id,
            reason: err instanceof Error ? err.message : String(err),
          });
          // Sentry sees the actual exception object so the stack trace and
          // Resend's structured error survive. inquiryId is the only PII-
          // free correlation handle; do NOT pass dto.email or dto.name as
          // tags — beforeSend would scrub them but the breadcrumb might
          // still leak in some Sentry transports.
          Sentry.captureException(err, {
            tags: {
              template: 'inquiry-submitter-confirmation',
              inquiryId: inquiry.id,
            },
          });
        }),
    );

    if (adminRecipients) {
      tasks.push(
        this.email
          .sendInquiryAdminAlert(adminRecipients, {
            inquiryId: inquiry.id,
            type: inquiry.type,
            submitterName: dto.name,
            submitterEmail: dto.email,
            submitterPhone: dto.phone,
            message: dto.message,
            budget: dto.budget,
            entityName: dto.entityName,
            source: dto.source,
            sourceUrl: dto.sourceUrl,
            adminUrl,
            receivedAt: inquiry.createdAt,
            locale: 'en',
          })
          .catch((err) => {
            this.logger.error({
              event: 'inquiry.admin_alert.threw',
              inquiryId: inquiry.id,
              reason: err instanceof Error ? err.message : String(err),
            });
            Sentry.captureException(err, {
              tags: {
                template: 'inquiry-admin-alert',
                inquiryId: inquiry.id,
              },
            });
          }),
      );
    } else {
      this.logger.warn({
        event: 'inquiry.admin_alert.skipped',
        inquiryId: inquiry.id,
        reason: 'INQUIRIES_NOTIFY_TO unset',
      });
    }

    await Promise.all(tasks);
  }

  private deriveSubmitterLocale(sourceUrl?: string): InquirySubmitterLocale {
    if (!sourceUrl) return 'en';
    const match = sourceUrl.match(/\/(en|ro|fr|de)(?:\/|$|\?)/);
    const candidate = match?.[1];
    return candidate && SUBMITTER_LOCALES.has(candidate as InquirySubmitterLocale)
      ? (candidate as InquirySubmitterLocale)
      : 'en';
  }

  /**
   * Narrow an arbitrary string (e.g. the value loaded from the DB column)
   * to a known submitter locale. Defends against historical rows where
   * `locale` might be NULL or an unexpected value.
   */
  private normalizeSubmitterLocale(raw: unknown): InquirySubmitterLocale {
    return typeof raw === 'string' &&
      SUBMITTER_LOCALES.has(raw as InquirySubmitterLocale)
      ? (raw as InquirySubmitterLocale)
      : 'en';
  }

  /**
   * Maps the client-stamped `source` (e.g. "tge-contact", "revery-property-detail",
   * "academy-support") back to a human-readable brand name for the email
   * signoff. Falls back to a neutral label so a malformed source string still
   * produces a sensible email.
   */
  private deriveBrandName(source?: string): string {
    if (!source) return 'Transylvania Grand Estate';
    if (source.startsWith('revery-')) return 'Reveria';
    if (source.startsWith('academy-')) return 'TGE Academy';
    if (source.startsWith('tge-')) return 'Transylvania Grand Estate';
    return 'Transylvania Grand Estate';
  }

  private buildAdminUrl(inquiryId: string): string {
    const base = this.config
      .get<string>('ADMIN_PUBLIC_URL', 'http://localhost:3051')
      .replace(/\/$/, '');
    // Deliberately unprefixed. The admin edge middleware redirects unprefixed
    // hits to the recipient's preferred locale (NEXT_LOCALE cookie →
    // Accept-Language → default), which is better UX than hardcoding `/ro/`
    // and forcing every non-RO admin to switch on each click.
    return `${base}/inquiries?id=${inquiryId}`;
  }

  async findAll(
    query: QueryInquiryDto,
    user?: CurrentUserPayload | null,
    site?: SiteContext,
  ) {
    const {
      page = 1,
      limit = 12,
      type,
      status,
      siteId,
      app,
      source,
      includeDeleted,
    } = query;
    const where: Prisma.InquiryWhereInput = {};
    if (type) where.type = type;
    if (status) where.status = status;
    // Soft-delete: hide deleted rows by default. Admin operators can opt in
    // via `?includeDeleted=1` when triaging deletion-restore requests.
    if (!includeDeleted) where.deletedAt = null;

    // Optional explicit site/app filters for the admin queue's chip filters.
    // These narrow within whatever site scope the caller already has — they
    // can't widen it.
    if (siteId) where.siteId = siteId;
    if (app) where.app = app;
    // Source attribution filter — substring match (case-insensitive) so
    // operators can search "revery", "property-detail", etc. without knowing
    // the full tag.
    if (source) where.source = { contains: source, mode: 'insensitive' };

    // Brand isolation. The X-Site header drives `site.id`. Public-brand
    // requests (TGE_LUXURY, REVERY) clamp the result to their own siteId
    // even on the admin endpoints — that's the contract the brand model
    // documents (project_brand_model.md). ADMIN/SUPER_ADMIN coming through
    // the admin console see X-Site=ADMIN and stay unrestricted.
    if (site && PUBLIC_SITE_IDS.has(site.id)) {
      where.siteId = site.id;
    }

    // AGENT users see only inquiries whose linked Property belongs to them.
    // Inquiries with no property (general contact) are excluded from AGENT view
    // by design — those belong to admins. Scope is appended after query
    // filters so a crafted `?type=…` can't widen it.
    if (user?.role === AdminRole.AGENT) {
      if (!user.agentId) {
        // Agent without a linked Agent record: no inquiries are theirs.
        where.property = { agentId: '__no-agent__' };
      } else {
        where.property = { agentId: user.agentId };
      }
    }

    // Include the linked Property's title so the admin UI can show a
    // human-readable reference (e.g. "Vilă în Brașov") instead of the raw
    // slug. Cheap join — Inquiry has at most one linked Property via the
    // unique propertySlug FK. Tier-scoping the include isn't required here:
    // admin/super_admin are unrestricted, and AGENT is already constrained
    // by the where-clause on `property.agentId` above.
    return paginate(
      (skip, take) =>
        this.prisma.inquiry.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          include: {
            property: { select: { id: true, slug: true, title: true } },
          },
        }),
      () => this.prisma.inquiry.count({ where }),
      page,
      limit,
    );
  }

  async findById(id: string) {
    // Reads exclude soft-deleted rows; admin operators wanting to restore
    // them go through findAll with includeDeleted=1 and then trigger
    // restore() directly.
    return ensureFound(
      this.prisma.inquiry.findFirst({
        where: { id, deletedAt: null },
        include: { property: { select: { id: true, slug: true, title: true } } },
      }),
      'Inquiry',
    );
  }

  async updateStatus(id: string, dto: UpdateInquiryStatusDto) {
    // Read the row before mutation so we can detect the new→read transition
    // for SLA tracking. The histogram fires only on the FIRST transition
    // (status was 'new' AND new value is 'read'); subsequent toggles
    // (read↔archived↔read) don't update the SLA observation.
    const before = await this.ensureExists(id);
    const updated = await this.prisma.inquiry.update({
      where: { id },
      data: { status: dto.status },
    });
    if (before.status === 'new' && dto.status === 'read') {
      const elapsedSeconds =
        (Date.now() - before.createdAt.getTime()) / 1000;
      this.metrics.inquiryTimeToRead.observe(
        { app: before.app ?? 'unknown' },
        elapsedSeconds,
      );
    }
    return updated;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Soft-delete: flip `deletedAt` instead of dropping the row. The column
    // gives operators a recoverable trash-can; `purgeSoftDeleted()` below
    // hard-deletes rows past the GDPR retention window.
    return this.prisma.inquiry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // GDPR right-to-erasure retention window: soft-deleted inquiries carry PII
  // (name/email/phone/message) and must be hard-purged, not kept indefinitely.
  private static readonly SOFT_DELETE_RETENTION_DAYS = 90;

  /**
   * Daily hard-purge of inquiries soft-deleted longer than the retention
   * window. Satisfies GDPR right-to-erasure — the soft-delete trash-can is
   * recoverable for 90 days, then the row (and its PII) is dropped for good.
   * Advisory-locked so overlapping instances don't double-run.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeSoftDeleted(): Promise<void> {
    await withAdvisoryLock(this.prisma, 'inquiries.purge', async () => {
      const cutoff = new Date(
        Date.now() -
          InquiriesService.SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      const { count } = await this.prisma.inquiry.deleteMany({
        where: { deletedAt: { not: null, lt: cutoff } },
      });
      if (count > 0) {
        this.logger.log({ event: 'inquiries.purged_bulk', count });
      }
    });
  }

  /** Restores a soft-deleted inquiry. Admin-only, used from the operator UI. */
  async restore(id: string) {
    const inquiry = await ensureFound(
      this.prisma.inquiry.findUnique({ where: { id } }),
      'Inquiry',
    );
    if (inquiry.deletedAt === null) return inquiry; // already live, no-op
    return this.prisma.inquiry.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  private ensureExists(id: string) {
    return ensureFound(
      this.prisma.inquiry.findFirst({
        where: { id, deletedAt: null },
      }),
      'Inquiry',
    );
  }
}
