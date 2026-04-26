import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
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
import { AdminRole } from '@prisma/client';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { GoogleVerifiedProfile } from './strategies/google.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { InvitationsService } from '../invitations/invitations.service';
import { MetricsService } from '../metrics/metrics.service';
import { AuditService } from '../audit/audit.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => InvitationsService))
    private invitationsService: InvitationsService,
    private metrics: MetricsService,
    private audit: AuditService,
  ) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(
    @Request() req: { user: { id: string; jti: string | null } },
  ) {
    // Rotate the refresh token: revoke the just-used jti before issuing a new
    // pair so a stolen-and-replayed token can be used at most once. The
    // refresh strategy already validated that the incoming jti is not in the
    // denylist; we add it now so the next reuse attempt is rejected.
    return this.authService.refresh(req.user.id, req.user.jti);
  }

  /**
   * Revoke the refresh token carried in the request body. The admin's
   * `/api/auth/logout` proxy posts the cookie's refresh token here before
   * clearing the cookie client-side, so the jti lands in the denylist and
   * any stolen copy of the token (e.g. from XSS or device loss) is dead on
   * arrival. Bypasses the throttler because logout should always succeed.
   */
  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('logout')
  async logout(
    @Request()
    req: {
      user: { id: string; jti: string | null };
    },
  ) {
    if (req.user.jti) {
      await this.authService.revokeRefreshToken(
        req.user.jti,
        req.user.id,
        'logout',
      );
    }
    // Audit the logout through explicit write; interceptor's URL classifier
    // also catches this but that path is only for authenticated sessions,
    // not for this @Public + refresh-token flow.
    this.audit.record({
      actorId: req.user.id,
      action: 'user.logout',
      resource: 'AdminUser',
      resourceId: req.user.id,
    });
    return { ok: true };
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Get('users')
  async listUsers() {
    return this.authService.listUsers();
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Patch('users/:id')
  async updateUser(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.authService.updateUser(req.user.id, id, dto);
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Delete('users/:id')
  async deleteUser(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.authService.deleteUser(req.user.id, id);
  }

  @Get('me')
  async getProfile(@Request() req: { user: { id: string } }) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('change-password')
  async changePassword(
    @Request() req: { user: { id: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, dto);
  }

  /**
   * Start the Google OAuth flow. An `invitation` query param (the plaintext
   * token from the accept-invite email) is HMAC-signed into `state` so the
   * callback can tell "accepting an invite" apart from "signing in" and so
   * a MITM can't swap the token mid-flow. Without configured Google creds
   * this 501s — the admin UI inspects the error code to hide the button.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get('google')
  async googleAuth(
    @Query('invitation') invitation: string | undefined,
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    this.ensureGoogleConfigured();
    // Attach state via req.query so passport picks it up; passport-oauth2
    // reads `req.query.state` when `state` is a truthy string in options.
    // We use a short-lived JWT so the callback can prove the state wasn't
    // manufactured — the JWT's signature IS the HMAC.
    const state = this.signOAuthState({ invitation: invitation ?? null });
    // Re-enter through AuthGuard('google') with the state attached. Easiest
    // way: redirect back to /auth/google with passport kicking in; but
    // since this handler already ran, we instead construct the redirect URL
    // manually using passport's internals... Too fragile. Simpler: always
    // use the AuthGuard but pass state via `passport.authenticate` options
    // through a monkey-patch. The simplest-that-works: set the state on the
    // session-less request object and let passport's oauth2 strategy read it.
    // passport-oauth2 accepts `options.state` only when session is enabled.
    // Without sessions, we rely on the client preserving the state via the
    // Google consent URL itself — so we construct the URL and redirect.
    const clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const callback = this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callback,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    void req; // marker: req is unused beyond the type
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  /**
   * Google OAuth callback. Handles both the "signing in" and "accepting
   * invite" branches, then redirects back to the admin origin with the
   * refresh token in the URL fragment so the admin can set an httpOnly
   * cookie on its own host. See `apps/admin/src/app/[locale]/auth/complete`.
   */
  @Public()
  @UseGuards(GoogleAuthGuard)
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
    const profile = req.user;
    const adminBase = this.getAdminBase();
    if (!profile) {
      return this.redirectWithError(
        res,
        adminBase,
        req.__oauthError ?? 'oauth_failed',
      );
    }

    let invitationToken: string | null = null;
    if (rawState) {
      try {
        const payload = this.verifyOAuthState(rawState);
        invitationToken = payload.invitation ?? null;
      } catch {
        return this.redirectWithError(res, adminBase, 'state_invalid');
      }
    }

    try {
      const tokens = invitationToken
        ? await this.invitationsService.acceptWithGoogle(invitationToken, {
            providerAccountId: profile.providerAccountId,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
          })
        : await this.authService.signInWithGoogle({
            providerAccountId: profile.providerAccountId,
            email: profile.email,
          });

      // Audit the sign-in / invitation accept. Two distinct actions so the
      // log reader can tell a first-time acceptance apart from a returning
      // user logging in. `invitationToken != null` is the disambiguator \u2014
      // invited acceptance creates the AdminUser + OAuthIdentity here for
      // the first time, returning sign-in resolves an existing identity.
      void this.audit.record({
        actorId: tokens.user.id,
        action: invitationToken ? 'user.accept-google' : 'user.login-google',
        resource: 'AdminUser',
        resourceId: tokens.user.id,
      });

      const dest =
        tokens.user.role === AdminRole.AGENT ? '/my-listings' : '/';
      const fragment = new URLSearchParams({
        rt: tokens.refreshToken,
        dest,
      }).toString();
      res.redirect(`${adminBase}/auth/complete#${fragment}`);
    } catch (err) {
      const code =
        err instanceof HttpException &&
        typeof err.getResponse() === 'object' &&
        err.getResponse() !== null &&
        'code' in (err.getResponse() as Record<string, unknown>)
          ? ((err.getResponse() as { code?: string }).code ?? 'oauth_failed')
          : 'oauth_failed';
      return this.redirectWithError(res, adminBase, code);
    }
  }

  private ensureGoogleConfigured(): void {
    const id = this.config.get<string>('GOOGLE_CLIENT_ID');
    const secret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const cb = this.config.get<string>('GOOGLE_CALLBACK_URL');
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

  /**
   * State carries the invitation token (if any) across Google's redirect. The
   * JWT signature is the only integrity check — no session, no server-side
   * nonce store. Replay is bounded by three independent layers:
   *   1. Google's OAuth `code` is single-use; the provider rejects the second
   *      exchange even if an attacker captures the callback URL.
   *   2. `acceptWithGoogle` does a compare-and-swap on invitation status, so
   *      a second replay against the invitation branch can't double-consume.
   *   3. The 10-minute TTL caps the window within which either of the above
   *      matters.
   * Adding a session-bound nonce would be defense-in-depth only; skip unless
   * threat modelling turns up a concrete gap these three don't already close.
   */
  private signOAuthState(payload: { invitation: string | null }): string {
    const secret = this.config.getOrThrow<string>('INVITATION_TOKEN_SECRET');
    return this.jwtService.sign(payload, {
      secret,
      expiresIn: '10m',
    });
  }

  private verifyOAuthState(state: string): { invitation: string | null } {
    const secret = this.config.getOrThrow<string>('INVITATION_TOKEN_SECRET');
    return this.jwtService.verify<{ invitation: string | null }>(state, {
      secret,
    });
  }

  private getAdminBase(): string {
    return this.config
      .getOrThrow<string>('ADMIN_PUBLIC_URL')
      .replace(/\/$/, '');
  }

  private redirectWithError(
    res: ExpressResponse,
    base: string,
    code: string,
  ) {
    this.metrics.oauthRejections.inc({ reason: code.toLowerCase() });
    res.redirect(`${base}/login?error=${encodeURIComponent(code.toLowerCase())}`);
  }
}
