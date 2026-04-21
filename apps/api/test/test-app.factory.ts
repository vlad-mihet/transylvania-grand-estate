import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';

/**
 * Captured copy of every email the service would have sent. Tests read this
 * instead of trying to parse logs or hit Resend. One shared instance per
 * TestingModule; cleared in `per-test-reset.ts` so cross-test leakage is
 * impossible.
 */
export interface CapturedEmail {
  to: string;
  template: string;
  url?: string;
  subject: string;
}

export class MockEmailService {
  readonly captured: CapturedEmail[] = [];

  async sendAgentInvitation(to: string, input: { acceptUrl: string }) {
    this.captured.push({
      to,
      template: 'agent-invitation',
      url: input.acceptUrl,
      subject: 'invitation',
    });
    return { ok: true as const, id: 'mock-id' };
  }

  async sendPasswordReset(to: string, input: { resetUrl: string }) {
    this.captured.push({
      to,
      template: 'password-reset',
      url: input.resetUrl,
      subject: 'reset',
    });
    return { ok: true as const, id: 'mock-id' };
  }

  async sendInvitationReminder(to: string, input: { acceptUrl: string }) {
    this.captured.push({
      to,
      template: 'invitation-reminder',
      url: input.acceptUrl,
      subject: 'reminder',
    });
    return { ok: true as const, id: 'mock-id' };
  }
}

/**
 * Spin up a fresh Nest app per suite. Returns the app + a handle to the
 * MockEmailService so assertions can read `mockEmail.captured`. We don't
 * start an HTTP server \u2014 supertest wraps the underlying Express handle.
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  mockEmail: MockEmailService;
}> {
  const mockEmail = new MockEmailService();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailService)
    .useValue(mockEmail)
    .compile();

  const app = moduleRef.createNestApplication({ rawBody: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();

  return { app, mockEmail };
}
