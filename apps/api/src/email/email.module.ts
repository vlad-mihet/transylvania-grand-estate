import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Transactional email. Currently only used by the Invitations module to send
 * agent onboarding links, but the service is generic so future templates
 * (password reset, inquiry notifications) can land here without a new module.
 */
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
