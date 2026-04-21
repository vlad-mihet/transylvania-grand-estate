import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module';
import { ResendWebhookController } from './resend.controller';

/**
 * Inbound webhooks from external providers. Currently Resend only; add
 * additional providers as their own controllers in this module.
 */
@Module({
  imports: [InvitationsModule],
  controllers: [ResendWebhookController],
})
export class WebhooksModule {}
