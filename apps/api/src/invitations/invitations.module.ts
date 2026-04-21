import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  // forwardRef breaks the cycle with AuthModule: Auth depends on Invitations
  // for the Google-accept path; Invitations depends on AuthService for JWT
  // minting. Nest resolves each via the runtime proxy.
  imports: [forwardRef(() => AuthModule), EmailModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
