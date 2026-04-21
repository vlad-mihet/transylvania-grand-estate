import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

interface RefreshPayload {
  sub: string;
  type: string;
  jti?: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validate(payload: RefreshPayload) {
    if (payload.type !== 'refresh') throw new UnauthorizedException();
    // Tokens minted before the jti rollout have no jti \u2014 accept them during
    // the transition window so existing sessions don't all break on deploy.
    // New tokens all carry one; if its jti is in the denylist, reject.
    if (
      payload.jti &&
      (await this.authService.isRefreshTokenRevoked(payload.jti))
    ) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    return { id: payload.sub, jti: payload.jti ?? null };
  }
}
