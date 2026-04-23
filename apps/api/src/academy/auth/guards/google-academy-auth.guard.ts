import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { UnverifiedGoogleEmailError } from '../../../auth/strategies/google.strategy';

/**
 * Google callback guard for academy. Catches Passport errors (e.g. the
 * unverified-email sentinel) and forwards them as `__oauthError` so the
 * controller can redirect to the academy app with a user-facing reason
 * code instead of surfacing a 500.
 */
@Injectable()
export class GoogleAcademyAuthGuard extends AuthGuard('google-academy') {
  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err) {
      const req = context
        .switchToHttp()
        .getRequest<Request & { __oauthError?: string }>();
      if (err instanceof UnverifiedGoogleEmailError) {
        req.__oauthError = 'email_unverified';
      } else {
        req.__oauthError = 'oauth_failed';
      }
      return null as unknown as TUser;
    }
    return (user || null) as unknown as TUser;
  }
}
