import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module';
import { AcademyModule } from '../academy/academy.module';
import { ResendWebhookController } from './resend.controller';

/**
 * Inbound webhooks from external providers. Currently Resend only; add
 * additional providers as their own controllers in this module.
 *
 * Both invitation modules are imported so the bounce/complaint dispatcher
 * can hand off to whichever owns the email. `resendEmailId` is unique
 * across both surfaces; the dispatcher tries admin first, then academy.
 */
@Module({
  imports: [InvitationsModule, AcademyModule],
  controllers: [ResendWebhookController],
})
export class WebhooksModule {}
