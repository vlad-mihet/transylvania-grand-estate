import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Query,
  Req,
  Request,
  Res,
  UseGuards,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { AcademyAuthService } from './academy-auth.service';
import { AcademyLoginDto } from './dto/login.dto';
import { AcademyChangePasswordDto } from './dto/change-password.dto';
import {
  AcademyForgotPasswordDto,
  AcademyResetPasswordDto,
  UpdateAcademyProfileDto,
} from './dto/forgot-password.dto';
import {
  AcademyRegisterDto,
  AcademyResendVerificationDto,
  AcademyVerifyEmailDto,
} from './dto/register.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Realm } from '../../common/decorators/realm.decorator';
import {
  CurrentAcademyUser,
  type AcademyUserPayload,
} from '../../common/decorators/academy-user.decorator';
import { JwtAcademyAuthGuard } from './guards/jwt-academy-auth.guard';
import { GoogleAcademyAuthGuard } from './guards/google-academy-auth.guard';
import type { GoogleVerifiedProfile } from '../../auth/strategies/google.strategy';
import { AcademyInvitationsService } from '../invitations/academy-invitations.service';

/**
 * Academy-realm auth surface. Mounted under `/academy/auth` so every route
 * lives in a URL namespace distinct from admin. The global `JwtAuthGuard`
 * APP_GUARD runs first but — because admin-realm JWT is absent on academy
 * requests — yields an unauthenticated pass-through; academy routes use
 * `@UseGuards(JwtAcademyAuthGuard)` to enforce their own strategy.
 */
@ApiTags('Academy Auth')
@Controller('academy/auth')
@Realm('academy')
@UseGuards(JwtAcademyAuthGuard)
export class AcademyAuthController {
  constructor(
    private readonly authService: AcademyAuthService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => AcademyInvitationsService))
    private readonly invitationsService: AcademyInvitationsService,
  ) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() dto: AcademyLoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(AuthGuard('jwt-academy-refresh'))
  @Post('refresh')
  async refresh(@Request() req: { user: { id: string } }) {
    return this.authService.refresh(req.user.id);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-academy-refresh'))
  @Post('logout')
  async logout(
    @Request()
    req: { user: { id: string; jti: string | null } },
  ) {
    if (req.user.jti) {
      await this.authService.revokeRefreshToken(
        req.user.jti,
        req.user.id,
        'logout',
      );
    }
    return { ok: true };
  }

  @Get('me')
  async getProfile(@CurrentAcademyUser() user: AcademyUserPayload | null) {
    if (!user) throw new HttpException('Unauthenticated', HttpStatus.UNAUTHORIZED);
    return this.authService.getProfile(user.id);
  }

  @Patch('me')
  async updateProfile(
    @CurrentAcademyUser() user: AcademyUserPayload | null,
    @Body() dto: UpdateAcademyProfileDto,
  ) {
    if (!user) throw new HttpException('Unauthenticated', HttpStatus.UNAUTHORIZED);
    return this.authService.updateProfile(user.id, dto);
  }

  /**
   * Always returns 200. Response never discloses whether the email is
   * in the academy user pool — the success copy is the same either way.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: AcademyForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto);
  }

  /**
   * Public self-service registration. Always-202 response — the same
   * "check your inbox" message covers new accounts, retries, and taken
   * addresses so the endpoint never reveals whether the email is in the
   * pool. Tight throttle (3/min/IP) because hot-path cost is an email.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('register')
  async register(@Body() dto: AcademyRegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Consumes the token from the verification email. Success returns
   * `{ accessToken, refreshToken, user }` — the client stores both and
   * lands on the dashboard. Verification also flips the wildcard
   * AcademyEnrollment on so every published course is immediately
   * readable.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('verify-email')
  async verifyEmail(@Body() dto: AcademyVerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  /**
   * Re-sends a verification email for a pending self-registration.
   * Silently returns 202 for unknown / already-verified addresses to
   * match the anti-enumeration posture of /register.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 2 } })
  @Post('resend-verification')
  async resendVerification(@Body() dto: AcademyResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: AcademyResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  async changePassword(
    @CurrentAcademyUser() user: AcademyUserPayload | null,
    @Body() dto: AcademyChangePasswordDto,
  ) {
    if (!user) throw new HttpException('Unauthenticated', HttpStatus.UNAUTHORIZED);
    return this.authService.changePassword(user.id, dto);
  }

  /**
   * Start Google OAuth for academy. Mirrors admin's manual consent-URL
   * construction because passport-oauth2 stateful `options.state` needs a
   * session; we don't have one. The invitation token is HMAC-signed into
   * the state JWT so the callback can distinguish "accepting invite" from
   * "returning sign-in" and can't be spoofed mid-flow.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get('google')
  async googleAuth(
    @Query('invitation') invitation: string | undefined,
    @Query('intent') intent: string | undefined,
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    this.ensureGoogleConfigured();
    const state = this.signOAuthState({
      invitation: invitation ?? null,
      intent: intent === 'register' ? 'register' : null,
    });
    const clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const callback = this.config.getOrThrow<string>('GOOGLE_ACADEMY_CALLBACK_URL');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callback,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    void req;
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  @Public()
  @UseGuards(GoogleAcademyAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @Req()
    req: ExpressRequest & {
      user?: GoogleVerifiedProfile;
      __oauthError?: string;
    },
    @Res() res: ExpressResponse,
    @Query('state') rawState?: string,
  ) {
    const academyBase = this.getAcademyBase();
    const profile = req.user;
    if (!profile) {
      return this.redirectWithError(
        res,
        academyBase,
        req.__oauthError ?? 'oauth_failed',
      );
    }

    let invitationToken: string | null = null;
    let intent: 'register' | null = null;
    if (rawState) {
      try {
        const payload = this.verifyOAuthState(rawState);
        invitationToken = payload.invitation ?? null;
        intent = payload.intent === 'register' ? 'register' : null;
      } catch {
        return this.redirectWithError(res, academyBase, 'state_invalid');
      }
    }

    try {
      let tokens: { refreshToken: string };
      if (invitationToken) {
        // Invitation path wins over register intent — a user who
        // received an invite should consume it (even if they arrived
        // via the /register button).
        tokens = await this.invitationsService.acceptWithGoogle(
          invitationToken,
          {
            providerAccountId: profile.providerAccountId,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
          },
        );
      } else if (intent === 'register') {
        // Self-service signup via Google. The helper is idempotent:
        // returning users get tokens, new Google accounts get a fresh
        // AcademyUser + wildcard enrollment. EMAIL_EXISTS only fires
        // when a non-Google account already owns the email.
        tokens = await this.authService.signInOrProvisionViaGoogle({
          providerAccountId: profile.providerAccountId,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
        });
      } else {
        tokens = await this.authService.signInWithGoogle({
          providerAccountId: profile.providerAccountId,
          email: profile.email,
        });
      }

      const fragment = new URLSearchParams({
        rt: tokens.refreshToken,
        dest: '/',
      }).toString();
      res.redirect(`${academyBase}/auth/complete#${fragment}`);
    } catch (err) {
      const code =
        err instanceof HttpException &&
        typeof err.getResponse() === 'object' &&
        err.getResponse() !== null &&
        'code' in (err.getResponse() as Record<string, unknown>)
          ? ((err.getResponse() as { code?: string }).code ?? 'oauth_failed')
          : 'oauth_failed';
      return this.redirectWithError(res, academyBase, code);
    }
  }

  private ensureGoogleConfigured(): void {
    const id = this.config.get<string>('GOOGLE_CLIENT_ID');
    const secret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const cb = this.config.get<string>('GOOGLE_ACADEMY_CALLBACK_URL');
    if (!id || !secret || !cb) {
      throw new HttpException(
        {
          message: 'Google sign-in is not configured on this deployment',
          code: 'GOOGLE_NOT_CONFIGURED',
        },
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
  }

  private signOAuthState(payload: {
    invitation: string | null;
    intent: 'register' | null;
  }): string {
    const secret = this.config.getOrThrow<string>('INVITATION_TOKEN_SECRET');
    return this.jwtService.sign(payload, { secret, expiresIn: '10m' });
  }

  private verifyOAuthState(state: string): {
    invitation: string | null;
    intent?: 'register' | null;
  } {
    const secret = this.config.getOrThrow<string>('INVITATION_TOKEN_SECRET');
    return this.jwtService.verify<{
      invitation: string | null;
      intent?: 'register' | null;
    }>(state, { secret });
  }

  private getAcademyBase(): string {
    return this.config
      .getOrThrow<string>('ACADEMY_PUBLIC_URL')
      .replace(/\/$/, '');
  }

  private redirectWithError(
    res: ExpressResponse,
    base: string,
    code: string,
  ) {
    res.redirect(`${base}/login?error=${encodeURIComponent(code.toLowerCase())}`);
  }
}
