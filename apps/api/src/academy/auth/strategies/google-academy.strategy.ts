import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import {
  UnverifiedGoogleEmailError,
  type GoogleVerifiedProfile,
} from '../../../auth/strategies/google.strategy';

/**
 * Passport Google strategy scoped to the academy realm. Uses a different
 * callback URL (`GOOGLE_ACADEMY_CALLBACK_URL`) so the realm is a property
 * of the URL path — never a client-controlled query param. An attacker
 * cannot coerce an admin-minted session from an academy sign-in because
 * the two strategies are disjoint in both callback path and realm output.
 */
@Injectable()
export class GoogleAcademyStrategy extends PassportStrategy(
  Strategy,
  'google-academy',
) {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'placeholder-client-id',
      clientSecret:
        config.get<string>('GOOGLE_CLIENT_SECRET') || 'placeholder-secret',
      callbackURL:
        config.get<string>('GOOGLE_ACADEMY_CALLBACK_URL') ||
        'http://localhost:4000/api/v1/academy/auth/google/callback',
      scope: ['email', 'profile'],
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
