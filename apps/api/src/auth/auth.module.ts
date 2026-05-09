import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { InvitationsModule } from '../invitations/invitations.module';
import { PasswordResetModule } from '../password-reset/password-reset.module';

@Module({
  // forwardRef because InvitationsModule imports AuthModule for token issuing;
  // AuthController also needs InvitationsService for the Google-accept path.
  // PasswordResetModule is forwardRef'd for the same reason — admin-trigger
  // reset endpoint sits on AuthController, but PasswordResetModule already
  // imports AuthModule for issueTokensForUserId().
  imports: [
    PassportModule,
    JwtModule.register({}),
    forwardRef(() => InvitationsModule),
    forwardRef(() => PasswordResetModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
