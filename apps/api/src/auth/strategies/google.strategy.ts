import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';

/**
 * Shape emitted by `validate()` and attached to `req.user` on the Google
 * callback. Kept intentionally minimal — we only need the provider sub
 * (stable Google user id), the verified email, and names for creating
 * AdminUser rows during an invitation accept.
 */
export interface GoogleVerifiedProfile {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
}

/**
 * Passport strategy for Google OAuth 2.0. Constructed unconditionally so the
 * Nest module graph always boots — when GOOGLE_CLIENT_* env is unset (the
 * common case until the GCP project is provisioned) the strategy receives
 * placeholder values and the controller short-circuits with 501 before any
 * redirect to Google happens. See `AuthController.googleAuth`.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'placeholder-client-id',
      clientSecret:
        config.get<string>('GOOGLE_CLIENT_SECRET') || 'placeholder-secret',
      callbackURL:
        config.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:4000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
      // We pass the invitation token through `state` (HMAC-signed in the
      // controller before the redirect to Google). `passReqToCallback` is off;
      // the state is retrieved from `req.query.state` in the callback handler.
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google profile is missing an email'), undefined);
      return;
    }
    // Google will happily return `verified: false` for unverified accounts
    // (rare on the consumer side, more common for Workspace trials). An
    // attacker who sets up an unverified Google account can claim any email
    // string \u2014 so we refuse to mint an AdminUser without a verified
    // binding. The controller maps this rejection to an error redirect.
    const verified = profile.emails?.[0]?.verified === true;
    if (!verified) {
      done(new UnverifiedGoogleEmailError(email), undefined);
      return;
    }
    const result: GoogleVerifiedProfile = {
      providerAccountId: profile.id,
      email: email.toLowerCase(),
      emailVerified: verified,
      firstName: profile.name?.givenName ?? '',
      lastName: profile.name?.familyName ?? '',
    };
    done(null, result);
  }
}

/**
 * Sentinel error so the AuthController can recognise the unverified-email
 * case and map it to a user-facing `email_unverified` redirect, rather than
 * surfacing a generic 500.
 */
export class UnverifiedGoogleEmailError extends Error {
  readonly code = 'EMAIL_UNVERIFIED';
  constructor(email: string) {
    super(`Google reports this email (${email}) as unverified`);
  }
}
