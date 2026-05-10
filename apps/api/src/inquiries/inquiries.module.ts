import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';
import { InquiryRateLimitGuard } from './inquiry-rate-limit.guard';

@Module({
  imports: [EmailModule],
  controllers: [InquiriesController],
  providers: [InquiriesService, InquiryRateLimitGuard],
})
export class InquiriesModule {}
