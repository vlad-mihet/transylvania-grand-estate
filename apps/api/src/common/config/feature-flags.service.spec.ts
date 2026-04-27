import { ConfigService } from '@nestjs/config';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * Each flag's parse rule lives in exactly one place; pin both directions
 * (set / unset) so a future drift to e.g. boolean coercion is caught here
 * rather than as a silent regression in dependent services.
 */
describe('FeatureFlagsService', () => {
  function makeService(env: Record<string, string | undefined>) {
    const config = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
    return new FeatureFlagsService(config);
  }

  describe('emailVerificationDisabled', () => {
    it("returns true when EMAIL_VERIFICATION_DISABLED='1'", () => {
      const svc = makeService({ EMAIL_VERIFICATION_DISABLED: '1' });
      expect(svc.emailVerificationDisabled).toBe(true);
    });

    it.each(['0', '', 'true', 'yes', undefined])(
      'returns false when EMAIL_VERIFICATION_DISABLED=%p',
      (value) => {
        const svc = makeService({ EMAIL_VERIFICATION_DISABLED: value });
        expect(svc.emailVerificationDisabled).toBe(false);
      },
    );
  });

  describe('googleAuthDisabled', () => {
    it("returns true when GOOGLE_AUTH_DISABLED='1'", () => {
      const svc = makeService({ GOOGLE_AUTH_DISABLED: '1' });
      expect(svc.googleAuthDisabled).toBe(true);
    });

    it.each(['0', '', 'true', 'yes', undefined])(
      'returns false when GOOGLE_AUTH_DISABLED=%p',
      (value) => {
        const svc = makeService({ GOOGLE_AUTH_DISABLED: value });
        expect(svc.googleAuthDisabled).toBe(false);
      },
    );
  });
});
