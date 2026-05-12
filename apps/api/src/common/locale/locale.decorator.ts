import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { defaultLocale } from '@tge/locale';
import {
  LOCALE_SCOPE_METADATA,
  type LocaleContext,
  type LocaleScopeValue,
} from './locale.types';

/**
 * Inject the resolved `LocaleContext` for the current request. Falls back
 * to a synthetic default context if the middleware didn't run for some
 * reason — this should never happen in practice (the middleware is
 * registered globally) but the fallback keeps controllers tolerant of
 * direct unit-test invocations that bypass the HTTP stack.
 */
export const CurrentLocale = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): LocaleContext => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.locale ?? { locale: defaultLocale, source: 'default' };
  },
);

/**
 * Mark a controller method (or class) as opting in to the
 * `LocalizedSerializerInterceptor`. Without this marker, the interceptor
 * passes responses through unchanged — same shape as before Phase 4.
 *
 * `'public'` (the only value used today) means: collapse LocalizedString
 * fields to a single locale unless the caller explicitly opts back into
 * the full blob via `?expand=allLocales`. `'admin'` is reserved for a
 * future case where admin endpoints want explicit marking; today they're
 * unmarked and never collapse.
 */
export const LocaleScope = (scope: LocaleScopeValue = 'public') =>
  SetMetadata(LOCALE_SCOPE_METADATA, scope);
