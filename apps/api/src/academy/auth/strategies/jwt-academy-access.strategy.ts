import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthRealm } from '../../../common/auth/realm';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Academy-realm access-token strategy. Verifies tokens with
 * `JWT_ACADEMY_ACCESS_SECRET` — distinct from the admin secret so a leak of
 * one realm cannot forge tokens for the other. The realm-claim check below
 * is defense-in-depth on top of signature mismatch.
 *
 * Two token shapes flow through this strategy:
 *  - Regular student tokens (sub = AcademyUser.id). Per-request DB lookup
 *    enforces:
 *      1. `suspendedAt IS NOT NULL` ⇒ reject.
 *      2. `iat < tokensRevokedAt` ⇒ token issued before a revocation
 *         boundary is treated as stale.
 *  - Preview tokens (preview = true). Minted by an admin via
 *    AcademyAuthService.mintPreviewToken. No DB lookup — the synthetic
 *    `sub` doesn't reference an AcademyUser row. The strategy stamps
 *    `preview: { lessonId }` on req.user so the preview-only endpoint
 *    can authorise without enrollment.
 */
@Injectable()
export class JwtAcademyAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-academy-access',
) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACADEMY_ACCESS_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email?: string;
    name?: string;
    realm?: AuthRealm;
    iat?: number;
    preview?: boolean;
    previewLessonId?: string;
  }) {
    if (payload.realm !== 'academy') {
      throw new UnauthorizedException(
        'Token realm does not match academy surface',
      );
    }

    if (payload.preview === true) {
      // Preview tokens carry no live user — skip the DB lookup. The
      // dedicated preview endpoint is the only consumer; everywhere
      // else `previewLessonId` is undefined and the request behaves
      // like an unauthenticated one (route-specific guards reject it).
      if (!payload.previewLessonId) {
        throw new UnauthorizedException('Preview token missing lessonId');
      }
      return {
        id: payload.sub,
        email: '',
        name: '',
        realm: 'academy' as const,
        preview: { lessonId: payload.previewLessonId },
      };
    }

    const user = await this.prisma.academyUser.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        suspendedAt: true,
        tokensRevokedAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Academy user not found');
    }
    if (user.suspendedAt) {
      throw new UnauthorizedException({
        message: 'Account is suspended',
        code: 'SUSPENDED',
      });
    }
    if (user.tokensRevokedAt && payload.iat) {
      const tokenIatMs = payload.iat * 1000;
      if (tokenIatMs < user.tokensRevokedAt.getTime()) {
        throw new UnauthorizedException({
          message: 'Token has been revoked',
          code: 'REVOKED',
        });
      }
    }

    return {
      id: payload.sub,
      email: payload.email ?? '',
      name: payload.name ?? '',
      realm: 'academy' as const,
    };
  }
}
