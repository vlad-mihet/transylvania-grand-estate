import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AcademyAuthService } from './academy-auth.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { EmailService } from '../../email/email.service';
import type { MetricsService } from '../../metrics/metrics.service';
import type { AuditService } from '../../audit/audit.service';
import type { FeatureFlagsService } from '../../common/config/feature-flags.service';
import type { AcademyRegisterDto } from './dto/register.dto';

/**
 * Locks the EMAIL_VERIFICATION_DISABLED branch in `register()`. The two
 * outcomes are observable by:
 *   1. Whether `academyEmailVerificationToken.create` is called.
 *   2. Whether `emailService.sendAcademyVerification` is called.
 *   3. The discriminator on the response (`verificationRequired`).
 *
 * Anything that lets these three drift apart will surface here.
 */
describe('AcademyAuthService.register', () => {
  const NOW = new Date('2026-04-27T00:00:00.000Z');
  const USER_ID = '00000000-0000-0000-0000-0000000000aa';
  const DTO: AcademyRegisterDto = {
    email: 'user@example.com',
    password: 'CorrectHorseBatteryStaple9!',
    name: 'Ana',
    locale: 'ro',
  };

  function makePrisma() {
    const academyUser = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockResolvedValue({ id: USER_ID, name: DTO.name }),
      update: jest.fn(),
    };
    const academyEmailVerificationToken = {
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    };
    const $transaction = jest.fn().mockImplementation(async (ops: unknown) => {
      // Mirror Prisma's array-form $transaction — just resolve to [].
      if (Array.isArray(ops)) return Promise.all(ops);
      // Callback form not used by `register()`.
      return undefined;
    });
    return {
      prisma: {
        academyUser,
        academyEmailVerificationToken,
        $transaction,
      } as unknown as PrismaService,
      mocks: { academyUser, academyEmailVerificationToken },
    };
  }

  function makeService(flagOn: boolean) {
    const { prisma, mocks } = makePrisma();
    const jwtService = {
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
    } as unknown as JwtService;
    const configService = {
      get: jest.fn((k: string) => {
        if (k === 'JWT_ACCESS_SECRET') return 'a'.repeat(32);
        if (k === 'JWT_REFRESH_SECRET') return 'r'.repeat(32);
        if (k === 'JWT_ACCESS_EXPIRATION') return '15m';
        if (k === 'JWT_REFRESH_EXPIRATION') return '7d';
        if (k === 'ACADEMY_PUBLIC_URL') return 'http://localhost:3053';
        return undefined;
      }),
      getOrThrow: jest.fn((k: string) => {
        if (k === 'ACADEMY_PUBLIC_URL') return 'http://localhost:3053';
        return '';
      }),
    } as unknown as ConfigService;
    const emailService = {
      sendAcademyVerification: jest.fn().mockResolvedValue({ ok: true }),
    } as unknown as EmailService;
    const metrics = {
      academyRegistrations: { inc: jest.fn() },
    } as unknown as MetricsService;
    const auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditService;
    const flags = {
      get emailVerificationDisabled() {
        return flagOn;
      },
      get googleAuthDisabled() {
        return false;
      },
    } as unknown as FeatureFlagsService;

    const service = new AcademyAuthService(
      prisma,
      jwtService,
      configService,
      emailService,
      metrics,
      auditService,
      flags,
    );
    return { service, prisma, mocks, emailService, auditService };
  }

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('flag OFF: returns the silent-202 verificationRequired shape and issues a token', async () => {
    const { service, mocks, emailService } = makeService(false);
    const result = await service.register(DTO);
    expect(result).toEqual({ ok: true, verificationRequired: true });
    expect(mocks.academyEmailVerificationToken.create).toHaveBeenCalledTimes(1);
    expect(emailService.sendAcademyVerification).toHaveBeenCalledTimes(1);
    expect(mocks.academyUser.create).toHaveBeenCalledTimes(1);
    // The user is created with no verification timestamp under flag-off.
    const createArgs = mocks.academyUser.create.mock.calls[0][0];
    expect(createArgs.data.emailVerifiedAt).toBeUndefined();
  });

  it('flag ON: returns auto-login tokens, skips token + email, stamps emailVerifiedAt', async () => {
    const { service, mocks, emailService, auditService } = makeService(true);
    const result = await service.register(DTO);
    if (result.verificationRequired !== false) {
      throw new Error('expected auto-login response');
    }
    expect(result.ok).toBe(true);
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.refreshToken).toBe('signed.jwt.token');
    expect(result.user).toMatchObject({
      id: USER_ID,
      email: DTO.email.toLowerCase(),
      name: DTO.name,
    });
    expect(mocks.academyEmailVerificationToken.create).not.toHaveBeenCalled();
    expect(emailService.sendAcademyVerification).not.toHaveBeenCalled();
    // Both audit entries land — registered + bypass — so dashboards can
    // still pair "self-register without verify".
    const actions = (
      auditService.record as jest.Mock
    ).mock.calls.map((c) => c[0].action);
    expect(actions).toContain('academy-user.self-register');
    expect(actions).toContain('academy-user.verify-email-bypass');
    // User row carries the verification timestamp from the start.
    const createArgs = mocks.academyUser.create.mock.calls[0][0];
    expect(createArgs.data.emailVerifiedAt).toEqual(NOW);
    expect(createArgs.data.lastLoginAt).toEqual(NOW);
  });

  it('flag ON: email already taken+verified still returns the silent shape (no token leak)', async () => {
    const { service, mocks, emailService } = makeService(true);
    (mocks.academyUser.findUnique as jest.Mock).mockResolvedValueOnce({
      id: USER_ID,
      email: DTO.email,
      name: DTO.name,
      locale: 'ro',
      emailVerifiedAt: new Date('2026-01-01'),
    });
    const result = await service.register(DTO);
    expect(result).toEqual({ ok: true, verificationRequired: true });
    expect(mocks.academyUser.create).not.toHaveBeenCalled();
    expect(mocks.academyUser.update).not.toHaveBeenCalled();
    expect(emailService.sendAcademyVerification).not.toHaveBeenCalled();
  });
});

describe('AcademyAuthService.resendVerification', () => {
  function makeService(flagOn: boolean) {
    const findUnique = jest.fn();
    const prisma = {
      academyUser: { findUnique },
    } as unknown as PrismaService;
    const jwtService = { sign: jest.fn() } as unknown as JwtService;
    const configService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    } as unknown as ConfigService;
    const emailService = {
      sendAcademyVerification: jest.fn(),
    } as unknown as EmailService;
    const metrics = {
      academyRegistrations: { inc: jest.fn() },
    } as unknown as MetricsService;
    const auditService = {
      record: jest.fn(),
    } as unknown as AuditService;
    const flags = {
      get emailVerificationDisabled() {
        return flagOn;
      },
      get googleAuthDisabled() {
        return false;
      },
    } as unknown as FeatureFlagsService;
    const service = new AcademyAuthService(
      prisma,
      jwtService,
      configService,
      emailService,
      metrics,
      auditService,
      flags,
    );
    return { service, findUnique, emailService };
  }

  it('flag ON: short-circuits before any DB lookup and sends no email', async () => {
    const { service, findUnique, emailService } = makeService(true);
    const result = await service.resendVerification({
      email: 'user@example.com',
    });
    expect(result).toEqual({ ok: true });
    expect(findUnique).not.toHaveBeenCalled();
    expect(emailService.sendAcademyVerification).not.toHaveBeenCalled();
  });
});
