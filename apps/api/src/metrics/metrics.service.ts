import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Centralised Prometheus metrics. One service owns the Registry so the
 * /metrics endpoint (and any test harness) can serialize deterministically.
 * Call sites poke `.inc(...)` / `.observe(...)` without knowing the registry
 * shape.
 *
 * Label cardinality discipline: every label used here is low-cardinality
 * (fixed enum-ish values). Adding user IDs or emails as labels would blow
 * up the time-series count; use structured logs for per-entity data.
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly invitationsCreated = new Counter({
    name: 'tge_invitations_created_total',
    help: 'Invitations created via create+invite or invite-existing',
    labelNames: ['role', 'flow'] as const,
    registers: [this.registry],
  });

  readonly invitationsAccepted = new Counter({
    name: 'tge_invitations_accepted_total',
    help: 'Invitations accepted, by acceptance method',
    labelNames: ['method'] as const,
    registers: [this.registry],
  });

  readonly invitationsExpired = new Counter({
    name: 'tge_invitations_expired_total',
    help: 'Invitations auto-expired by the hourly sweep',
    registers: [this.registry],
  });

  readonly invitationsRevoked = new Counter({
    name: 'tge_invitations_revoked_total',
    help: 'Invitations manually revoked by an admin',
    registers: [this.registry],
  });

  readonly invitationsBounced = new Counter({
    name: 'tge_invitations_bounced_total',
    help: 'Invitations marked bounced via Resend webhook',
    labelNames: ['reason'] as const,
    registers: [this.registry],
  });

  readonly oauthRejections = new Counter({
    name: 'tge_oauth_rejections_total',
    help: 'Google OAuth callback rejections, by reason',
    labelNames: ['reason'] as const,
    registers: [this.registry],
  });

  readonly emailsSent = new Counter({
    name: 'tge_emails_sent_total',
    help: 'Transactional emails attempted, by template and result',
    labelNames: ['template', 'result'] as const,
    registers: [this.registry],
  });

  readonly emailSendDuration = new Histogram({
    name: 'tge_email_send_duration_seconds',
    help: 'End-to-end Resend API call latency, by template',
    labelNames: ['template'] as const,
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
    registers: [this.registry],
  });

  readonly invitationAcceptDuration = new Histogram({
    name: 'tge_invitation_accept_duration_seconds',
    help: 'Accept-invitation transaction duration, by method',
    labelNames: ['method'] as const,
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [this.registry],
  });

  readonly passwordResetsIssued = new Counter({
    name: 'tge_password_resets_issued_total',
    help: 'Password reset tokens issued (request accepted), regardless of whether the email matched an account',
    registers: [this.registry],
  });

  readonly passwordResetsCompleted = new Counter({
    name: 'tge_password_resets_completed_total',
    help: 'Password resets completed (token consumed, new password set)',
    registers: [this.registry],
  });

  // ── Academy ────────────────────────────────────────────────────────────
  // Separate namespace from the admin/invitation counters so dashboards
  // can attribute load + error rate to the academy product directly.

  readonly academyLogins = new Counter({
    name: 'tge_academy_logins_total',
    help: 'Academy student login attempts, bucketed by outcome',
    // SSO-only / wrong-password / unknown-user all roll up to `failure` —
    // the security-relevant aggregate is the failure rate, not the cause.
    labelNames: ['result'] as const,
    registers: [this.registry],
  });

  readonly academyInvitations = new Counter({
    name: 'tge_academy_invitations_total',
    help: 'Academy invitation lifecycle events',
    labelNames: ['outcome'] as const,
    registers: [this.registry],
  });

  readonly academyPasswordResets = new Counter({
    name: 'tge_academy_password_resets_total',
    help: 'Academy password reset lifecycle (request / complete / unknown email)',
    labelNames: ['outcome'] as const,
    registers: [this.registry],
  });

  readonly academyReorders = new Counter({
    name: 'tge_academy_reorders_total',
    help: 'Lesson reorder operations (one increment per drag-drop commit)',
    registers: [this.registry],
  });

  readonly academyLessonReads = new Counter({
    name: 'tge_academy_lesson_reads_total',
    help: 'Student lesson reads, bucketed by the locale the API actually served (may differ from the request locale when the fallback kicked in)',
    labelNames: ['locale'] as const,
    registers: [this.registry],
  });

  constructor() {
    // Default Node.js process metrics (event loop lag, GC, heap, RSS). Cheap
    // to collect, invaluable for diagnosing "is it the app or the infra".
    collectDefaultMetrics({ register: this.registry });
  }

  async serialize(): Promise<string> {
    return this.registry.metrics();
  }
}
