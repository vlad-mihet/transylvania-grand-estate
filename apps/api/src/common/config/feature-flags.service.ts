import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Single point of truth for permanent runtime feature flags. Wraps
 * ConfigService so consumers don't repeat the `=== '1'` parse and so the
 * env-var names live in exactly one file. Tests mock this service rather
 * than ConfigService.
 */
@Injectable()
export class FeatureFlagsService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  get emailVerificationDisabled(): boolean {
    return this.config.get<string>('EMAIL_VERIFICATION_DISABLED') === '1';
  }

  get googleAuthDisabled(): boolean {
    return this.config.get<string>('GOOGLE_AUTH_DISABLED') === '1';
  }
}
