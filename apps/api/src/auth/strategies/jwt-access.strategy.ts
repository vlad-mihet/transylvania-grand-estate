import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminRole } from '@prisma/client';
import type { AuthRealm } from '../../common/auth/realm';
import { AuthService } from '../auth.service';

/**
 * Admin-realm JWT strategy. Verifies tokens with `JWT_ADMIN_ACCESS_SECRET`,
 * which is distinct from the academy secret — cross-realm tokens fail
 * signature verification before any claim check. The realm-claim check below
 * is defense-in-depth and also lets pre-split tokens (no realm) be accepted
 * as admin until they expire.
 */
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ADMIN_ACCESS_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role?: AdminRole;
    agentId?: string | null;
    realm?: AuthRealm;
  }) {
    const realm: AuthRealm = payload.realm ?? 'admin';
    if (realm !== 'admin') {
      throw new UnauthorizedException('Token realm does not match admin surface');
    }
    if (!payload.role) {
      // An admin-realm token without a role is malformed — do not fall
      // through, or a default-role bypass could surface later.
      throw new UnauthorizedException('Admin token is missing role claim');
    }
    // Suspension lookup: cheap PK fetch on a hot row, but still one DB hit
    // per request. Acceptable at admin's traffic shape (handful of users,
    // O(req/s)). The throttle in touchLastSeen amortises the write side; the
    // status read is unbatched. If this grows we move it into a memoised
    // signed-cookie session check.
    await this.authService.assertUserNotSuspended(payload.sub);
    // Stamp lastSeenAt — write is throttled to once per 5 min per user, so
    // the read above is the dominant cost.
    void this.authService.touchLastSeen(payload.sub);
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      agentId: payload.agentId ?? null,
      realm,
    };
  }
}
