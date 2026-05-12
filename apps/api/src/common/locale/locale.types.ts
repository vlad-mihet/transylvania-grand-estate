import type { Locale } from '@tge/locale';

/**
 * How the locale was resolved for the current request. Surfaced for
 * observability (logs / metrics — e.g. tracking how often Accept-Language
 * detection fires vs explicit `?locale=`). Not a security signal.
 */
export type LocaleSource =
  | 'query'
  | 'accept-language'
  | 'cookie'
  | 'default';

export interface LocaleContext {
  locale: Locale;
  source: LocaleSource;
}

/**
 * Marker query value that opts a request out of the
 * `LocalizedSerializerInterceptor` collapse. Admin clients append this by
 * default (see `apps/admin/src/lib/api-client.ts`); editors need the full
 * blob to populate per-locale tabs.
 */
export const EXPAND_ALL_LOCALES = 'allLocales' as const;

/**
 * Reflector metadata key. Controllers that should have their responses
 * collapsed to a single locale opt in by marking the handler (or class)
 * with `@LocaleScope('public')`. Anything unmarked is passthrough — same
 * shape as before the interceptor existed.
 */
export const LOCALE_SCOPE_METADATA = 'locale-scope';

export type LocaleScopeValue = 'public' | 'admin';

declare module 'express-serve-static-core' {
  interface Request {
    locale?: LocaleContext;
  }
}
