import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthRealm } from '../../../common/auth/realm';

/**
 * Academy-realm access-token strategy. Verifies tokens with
 * `JWT_ACADEMY_ACCESS_SECRET` — distinct from the admin secret so a leak of
 * one realm cannot forge tokens for the other. The realm-claim check below
 * is defense-in-depth on top of signature mismatch.
 */
@Injectable()
export class JwtAcademyAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-academy-access',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACADEMY_ACCESS_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    name?: string;
    realm?: AuthRealm;
  }) {
    if (payload.realm !== 'academy') {
      throw new UnauthorizedException(
        'Token realm does not match academy surface',
      );
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? '',
      realm: 'academy' as const,
    };
  }
}
