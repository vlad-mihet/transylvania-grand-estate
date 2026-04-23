import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminRole } from '@prisma/client';
import type { AuthRealm } from '../../common/auth/realm';

/**
 * Admin-realm JWT strategy. Rejects tokens where `realm === 'academy'`; a
 * parallel `JwtAcademyAccessStrategy` handles those. Legacy tokens (minted
 * before the realm rollout) have no realm claim and are treated as admin.
 */
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
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
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      agentId: payload.agentId ?? null,
      realm,
    };
  }
}
