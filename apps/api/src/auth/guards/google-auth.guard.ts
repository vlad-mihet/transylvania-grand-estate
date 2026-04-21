import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Google OAuth callback guard. Overrides the default Passport behaviour of
 * throwing 401 on auth failure \u2014 that would crash us into the generic error
 * filter and return JSON, but the callback is a browser redirect target so
 * we need to always return HTML/302. Instead, we stash the failure cause on
 * the request and let the controller render a proper redirect with an error
 * query parameter the admin UI can surface in a banner.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const req = context
        .switchToHttp()
        .getRequest<{ __oauthError?: string }>();
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : 'oauth_failed';
      req.__oauthError = code.toLowerCase();
      // Return a falsy value so `req.user` stays undefined \u2014 the controller
      // sees no profile and branches into redirectWithError.
      return undefined as unknown as TUser;
    }
    return user;
  }
}
