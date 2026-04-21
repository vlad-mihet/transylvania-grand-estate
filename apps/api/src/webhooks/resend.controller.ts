import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { Webhook } from 'svix';
import { Public } from '../common/decorators/public.decorator';
import { InvitationsService } from '../invitations/invitations.service';

/**
 * Shape Resend emits for `email.*` events. Typed minimally; we don't rely
 * on fields outside the subset we need for bounce/complaint tracking.
 */
interface ResendEmailEvent {
  type:
    | 'email.sent'
    | 'email.delivered'
    | 'email.delivery_delayed'
    | 'email.bounced'
    | 'email.complained'
    | 'email.opened'
    | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    to: string[] | string;
    bounce?: { type?: 'hard' | 'soft'; message?: string };
  };
}

/**
 * Inbound Resend webhook. Decoupled from the Invitations controller so the
 * webhook can live under `/webhooks/*` \u2014 easier firewall / auth posture
 * rules, and less temptation to reuse admin-scoped middleware that'd bounce
 * Resend's IP. Hidden from Swagger; ops-only.
 */
@ApiExcludeController()
@Controller('webhooks/resend')
export class ResendWebhookController {
  private readonly logger = new Logger(ResendWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly invitations: InvitationsService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') svixId: string | undefined,
    @Headers('svix-timestamp') svixTimestamp: string | undefined,
    @Headers('svix-signature') svixSignature: string | undefined,
  ) {
    const secret = this.config.get<string>('RESEND_WEBHOOK_SECRET');
    if (!secret) {
      // Fail closed: if the secret isn't provisioned, we have no way to
      // authenticate the caller, so reject outright. Operators know what
      // to do with a 503 on a webhook endpoint; a 200 would silently
      // accept attacker traffic.
      throw new ServiceUnavailableException('Webhook receiver not configured');
    }
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new UnauthorizedException('Missing Svix signature headers');
    }
    if (!req.rawBody) {
      // Shouldn't happen: `NestFactory.create(..., { rawBody: true })` is
      // set in main.ts. Surface loudly if the bootstrap changes.
      throw new HttpException(
        'Raw body not captured \u2014 check main.ts rawBody flag',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    let event: ResendEmailEvent;
    try {
      const wh = new Webhook(secret);
      event = wh.verify(req.rawBody.toString('utf8'), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ResendEmailEvent;
    } catch (err) {
      this.logger.warn({
        event: 'webhook.resend.signature_invalid',
        reason: err instanceof Error ? err.message : 'unknown',
      });
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const to = Array.isArray(event.data.to) ? event.data.to[0] : event.data.to;
    if (!to) {
      this.logger.warn(`Resend event ${event.type} missing recipient`);
      return;
    }

    switch (event.type) {
      case 'email.bounced': {
        const bounceType = event.data.bounce?.type;
        await this.invitations.markBounced({
          resendEmailId: event.data.email_id,
          email: to,
          reason: bounceType === 'soft' ? 'soft' : 'hard',
        });
        break;
      }
      case 'email.complained': {
        await this.invitations.markBounced({
          resendEmailId: event.data.email_id,
          email: to,
          reason: 'complaint',
        });
        break;
      }
      case 'email.delivered':
      case 'email.sent':
      case 'email.delivery_delayed':
      case 'email.opened':
      case 'email.clicked':
        // No-op for now \u2014 useful signals to capture later for metrics, but
        // not actionable without engagement counters on the Invitation row.
        break;
      default:
        this.logger.log(`Unhandled Resend event type: ${event.type}`);
    }
  }
}
