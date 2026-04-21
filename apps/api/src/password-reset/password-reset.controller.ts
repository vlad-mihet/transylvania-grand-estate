import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { PasswordResetService } from './password-reset.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../common/decorators/public.decorator';

/**
 * Self-serve password recovery. All three endpoints are @Public because a
 * user who forgot their password is, by definition, unauthenticated. The
 * service layer enforces non-enumeration on /forgot-password and token
 * discipline on /reset-password.
 */
@ApiTags('Auth')
@Controller('auth')
export class PasswordResetController {
  constructor(private readonly service: PasswordResetService) {}

  /**
   * 5/60s IP throttle \u2014 tighter than the global 60/min so a scraper can't
   * use this endpoint for email enumeration via timing attacks. The service
   * returns identically regardless of whether the email exists.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('forgot-password')
  async forgot(@Body() dto: ForgotPasswordDto) {
    return this.service.requestReset(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get('reset-password/verify')
  async verify(@Query() query: VerifyResetTokenDto) {
    return this.service.verify(query.token);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('reset-password')
  async reset(@Body() dto: ResetPasswordDto) {
    return this.service.reset(dto);
  }
}
