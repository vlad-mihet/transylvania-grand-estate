import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthRealm } from '../../../common/auth/realm';
import { AcademyAuthService } from '../academy-auth.service';

interface RefreshPayload {
  sub: string;
  type: string;
  jti?: string;
  realm?: AuthRealm;
}

/**
 * Academy refresh strategy. Validates the refresh JWT, confirms the realm
 * claim, and rejects tokens whose `jti` has been revoked via the academy
 * denylist (logout, user-delete, enrollment-revocation-forced-signout).
 */
@Injectable()
export class JwtAcademyRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-academy-refresh',
) {
  constructor(
    configService: ConfigService,
    @Inject(forwardRef(() => AcademyAuthService))
    private readonly authService: AcademyAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validate(payload: RefreshPayload) {
    if (payload.type !== 'refresh') throw new UnauthorizedException();
    if (payload.realm !== 'academy') {
      throw new UnauthorizedException(
        'Refresh token realm does not match academy surface',
      );
    }
    if (
      payload.jti &&
      (await this.authService.isRefreshTokenRevoked(payload.jti))
    ) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    return { id: payload.sub, jti: payload.jti ?? null };
  }
}
