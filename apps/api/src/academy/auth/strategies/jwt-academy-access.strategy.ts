import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthRealm } from '../../../common/auth/realm';

/**
 * Academy-realm access-token strategy. Rejects tokens where `realm !==
 * 'academy'`. Shares the JWT_ACCESS_SECRET with the admin strategy because
 * the signing key is an infrastructure concern, not a per-surface one —
 * realm separation is enforced via claim matching, not a separate secret.
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
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
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
