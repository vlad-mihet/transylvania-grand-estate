import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { MetricsService } from '../metrics/metrics.service';
import {
  renderAgentInvitation,
  type AgentInvitationInput,
} from './templates/agent-invitation.template';
import {
  renderPasswordReset,
  type PasswordResetInput,
} from './templates/password-reset.template';
import {
  renderInvitationReminder,
  type InvitationReminderInput,
} from './templates/invitation-reminder.template';

/**
 * Thin wrapper over Resend. Two design choices:
 *
 * 1. When `RESEND_API_KEY` is unset (default in dev), we log the rendered
 *    message to stdout instead of making a network call. A fresh clone
 *    boots end-to-end without a Resend account, and the acceptance URL is
 *    visible in the server log when a developer invites an agent locally.
 *
 * 2. `send*` methods return a `{ ok: true } | { ok: false, reason }` result
 *    rather than throwing. Callers (Invitations service) log the failure
 *    and persist `emailSentAt IS NULL` so an admin can retry from the UI.
 *    A transient Resend outage should never fail the HTTP request that
 *    created the invitation.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private client: Resend | null = null;
  private from = '';

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.from =
      this.config.get<string>('EMAIL_FROM') ?? 'TGE <no-reply@localhost>';
    if (apiKey) {
      this.client = new Resend(apiKey);
      this.logger.log(`Email sending enabled (from=${this.from})`);
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not set \u2014 emails will be logged to stdout instead of sent',
      );
    }
  }

  async sendAgentInvitation(
    to: string,
    input: AgentInvitationInput,
  ): Promise<SendResult> {
    const { subject, html, text } = renderAgentInvitation(input);
    return this.deliver({ to, subject, html, text, template: 'agent-invitation' });
  }

  async sendPasswordReset(
    to: string,
    input: PasswordResetInput,
  ): Promise<SendResult> {
    const { subject, html, text } = renderPasswordReset(input);
    return this.deliver({ to, subject, html, text, template: 'password-reset' });
  }

  async sendInvitationReminder(
    to: string,
    input: InvitationReminderInput,
  ): Promise<SendResult> {
    const { subject, html, text } = renderInvitationReminder(input);
    return this.deliver({ to, subject, html, text, template: 'invitation-reminder' });
  }

  private async deliver(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    template: string;
  }): Promise<SendResult> {
    if (!this.client) {
      this.logger.log(
        `[DEV EMAIL]\nTo: ${params.to}\nSubject: ${params.subject}\n\n${params.text}`,
      );
      this.metrics.emailsSent.inc({ template: params.template, result: 'dev_log' });
      return { ok: true, id: 'dev-log' };
    }

    const endTimer = this.metrics.emailSendDuration.startTimer({
      template: params.template,
    });
    try {
      const started = Date.now();
      const res = await this.client.emails.send({
        from: this.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      const durationMs = Date.now() - started;
      endTimer();
      if (res.error) {
        this.metrics.emailsSent.inc({
          template: params.template,
          result: 'failure',
        });
        this.logger.error({
          event: 'email.send_failed',
          template: params.template,
          toDomain: emailDomain(params.to),
          durationMs,
          reason: res.error.message,
        });
        return { ok: false, reason: res.error.message };
      }
      this.metrics.emailsSent.inc({
        template: params.template,
        result: 'success',
      });
      // DEBUG: success path is counted in metrics; INFO is reserved for
      // events an on-call engineer would want to see at a glance.
      this.logger.debug({
        event: 'email.send_ok',
        template: params.template,
        toDomain: emailDomain(params.to),
        durationMs,
        messageId: res.data?.id,
      });
      return { ok: true, id: res.data?.id ?? 'unknown' };
    } catch (err) {
      endTimer();
      this.metrics.emailsSent.inc({
        template: params.template,
        result: 'threw',
      });
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error({
        event: 'email.send_threw',
        template: params.template,
        toDomain: emailDomain(params.to),
        reason: msg,
      });
      return { ok: false, reason: msg };
    }
  }
}

function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : 'unknown';
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; reason: string };
