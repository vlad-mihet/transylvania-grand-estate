import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RealmGuard } from './realm.guard';
import { REALM_KEY } from '../decorators/realm.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthRealm } from '../auth/realm';

/**
 * Realm-guard contract. A misbehaving guard is a silent privilege-escalation
 * bug — academy tokens crossing into admin routes, or vice versa — so the
 * matrix is pinned explicitly.
 */
describe('RealmGuard', () => {
  function makeContext(opts: {
    publicMeta?: boolean;
    realmMeta?: AuthRealm;
    user?: { realm?: AuthRealm };
  }): { context: ExecutionContext; reflector: Reflector } {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === IS_PUBLIC_KEY) return opts.publicMeta ?? undefined;
        if (key === REALM_KEY) return opts.realmMeta ?? undefined;
        return undefined;
      });
    const context = {
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({ user: opts.user }),
      }),
    } as unknown as ExecutionContext;
    return { context, reflector };
  }

  it('lets @Public() routes pass regardless of token realm', () => {
    const { context, reflector } = makeContext({ publicMeta: true });
    expect(new RealmGuard(reflector).canActivate(context)).toBe(true);
  });

  it('admin-realm routes (default when no @Realm) accept admin tokens', () => {
    const { context, reflector } = makeContext({
      user: { realm: 'admin' },
    });
    expect(new RealmGuard(reflector).canActivate(context)).toBe(true);
  });

  it('admin-realm routes reject academy tokens', () => {
    const { context, reflector } = makeContext({
      user: { realm: 'academy' },
    });
    expect(() => new RealmGuard(reflector).canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('admin-realm routes accept legacy tokens (missing realm claim defaults to admin)', () => {
    const { context, reflector } = makeContext({ user: {} });
    expect(new RealmGuard(reflector).canActivate(context)).toBe(true);
  });

  it('missing req.user defers to controller-level guards (global-guard case)', () => {
    // JwtAuthGuard short-circuits on @Realm("academy") routes without
    // populating req.user — controller-level JwtAcademyAuthGuard handles
    // authentication. Global RealmGuard must pass through, not reject.
    const { context, reflector } = makeContext({ realmMeta: 'academy' });
    expect(new RealmGuard(reflector).canActivate(context)).toBe(true);
  });

  it('@Realm("academy") routes accept academy tokens', () => {
    const { context, reflector } = makeContext({
      realmMeta: 'academy',
      user: { realm: 'academy' },
    });
    expect(new RealmGuard(reflector).canActivate(context)).toBe(true);
  });

  it('@Realm("academy") routes reject admin tokens', () => {
    const { context, reflector } = makeContext({
      realmMeta: 'academy',
      user: { realm: 'admin' },
    });
    expect(() => new RealmGuard(reflector).canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

});
