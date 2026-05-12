import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import {
  defaultLocale,
  locales,
  pickLocalized,
  type Locale,
} from '@tge/locale';
import {
  EXPAND_ALL_LOCALES,
  LOCALE_SCOPE_METADATA,
  type LocaleScopeValue,
} from './locale.types';

/**
 * Maximum recursion depth when walking the response payload. The deepest
 * known structure today is Property → Developer → properties[] → title
 * (depth 4); cap at 6 so future relation additions don't trip the guard,
 * but cycles or pathologically deep trees can't run away.
 */
const MAX_WALK_DEPTH = 6;

/**
 * Set of supported locale keys. Used by `isLocalizedShaped` to decide
 * whether an object should be treated as a `LocalizedString` rather than a
 * regular nested resource (e.g. `developer`, `agent`).
 */
const LOCALE_KEY_SET = new Set<string>(locales as readonly string[]);

/**
 * Fields whose collapsed value drives the resource's top-level
 * `_servedLocale`. The interceptor picks the first one present and reports
 * its served locale; this gives clients a single hint about which locale
 * actually paid out, without per-field metadata bloat. Order reflects
 * "primary visible identifier" across the resource zoo.
 */
const SERVED_LOCALE_PROBE_FIELDS = [
  'title',
  'name',
  'quote',
  'tagline',
  'bio',
  'description',
];

const SERVED_LOCALE_KEY = '_servedLocale';

/**
 * Walks responses from controllers marked `@LocaleScope('public')` and
 * collapses every `LocalizedString` field to a plain string in the
 * request's locale. Callers that need the full blob (admin editors)
 * append `?expand=allLocales` and the interceptor passes through.
 *
 * Unmarked controllers are passthrough — Phase 4 ships this interceptor
 * globally but inert; resources opt in one-by-one in PR 4b.
 *
 * Detection heuristic for "is this a LocalizedString?":
 * - plain object (not array, not null, no own non-locale string keys
 *   beyond the four)
 * - at least one of `ro|en|fr|de` is present as an own property
 * - values for those keys are strings or null
 *
 * Arrays are walked element-wise. Arrays of LocalizedString (e.g.
 * `Property.features`) collapse to arrays of plain strings. Nested
 * objects (Property → Developer) recurse so their LocalizedString
 * fields collapse too.
 */
@Injectable()
export class LocalizedSerializerInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const scope = this.reflector.getAllAndOverride<LocaleScopeValue>(
      LOCALE_SCOPE_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (scope !== 'public') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();

    if (req.query.expand === EXPAND_ALL_LOCALES) {
      return next.handle();
    }

    const locale = req.locale?.locale ?? defaultLocale;

    return next.handle().pipe(
      map((result) => this.collapseEnvelope(result, locale)),
    );
  }

  private collapseEnvelope(result: unknown, locale: Locale): unknown {
    // `TransformInterceptor` wraps responses as `{ success, data, meta }`.
    // Walk `data` only; `meta` carries pagination and is locale-agnostic.
    // When the wrapper isn't present yet (we run BEFORE TransformInterceptor
    // in interceptor chain order), the result IS the data — walk it
    // directly.
    if (
      result &&
      typeof result === 'object' &&
      'data' in (result as object) &&
      'meta' in (result as object)
    ) {
      const withData = result as { data: unknown; meta: unknown };
      return { ...withData, data: this.walk(withData.data, locale, 0, new WeakSet()) };
    }
    return this.walk(result, locale, 0, new WeakSet());
  }

  private walk(
    value: unknown,
    locale: Locale,
    depth: number,
    seen: WeakSet<object>,
  ): unknown {
    if (depth > MAX_WALK_DEPTH) return value;
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    if (Array.isArray(value)) {
      return value.map((item) => this.walk(item, locale, depth + 1, seen));
    }

    if (seen.has(value as object)) return value;
    seen.add(value as object);

    // Common non-walked types: Date, Buffer, anything not a plain object.
    if (
      value instanceof Date ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (value as any).constructor !== Object
    ) {
      return value;
    }

    if (isLocalizedShaped(value)) {
      return pickLocalized(value, locale).text;
    }

    return this.collapseObject(value as Record<string, unknown>, locale, depth, seen);
  }

  private collapseObject(
    obj: Record<string, unknown>,
    locale: Locale,
    depth: number,
    seen: WeakSet<object>,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    let servedLocale: Locale | null = null;

    for (const [key, raw] of Object.entries(obj)) {
      if (isLocalizedShaped(raw)) {
        const picked = pickLocalized(raw, locale);
        out[key] = picked.text;
        if (
          servedLocale === null &&
          SERVED_LOCALE_PROBE_FIELDS.includes(key) &&
          picked.text.length > 0
        ) {
          servedLocale = picked.servedLocale;
        }
      } else if (Array.isArray(raw)) {
        // Walk arrays: LocalizedString[] collapses to string[]; arrays of
        // nested objects (e.g. Course → Lesson[]) recurse so their
        // LocalizedString fields collapse.
        out[key] = raw.map((item) => this.walk(item, locale, depth + 1, seen));
      } else if (raw !== null && typeof raw === 'object') {
        out[key] = this.walk(raw, locale, depth + 1, seen);
      } else {
        out[key] = raw;
      }
    }

    out[SERVED_LOCALE_KEY] = servedLocale ?? locale;
    return out;
  }
}

/**
 * Exported for unit testing. A value is "localized-shaped" when it looks
 * like a Prisma JSON column of type `LocalizedString`: plain object whose
 * own enumerable keys are ALL drawn from the supported-locale set (no
 * other keys allowed), and at least one such key has a string value.
 *
 * The "all keys are locale codes" rule is what distinguishes a
 * `LocalizedString` from a regular nested resource. A `Developer` object
 * has keys like `name`, `slug`, `properties` — never `ro|en|fr|de`. A
 * `LocalizedString` has nothing but locale keys.
 */
export function isLocalizedShaped(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((value as any).constructor !== Object) return false;

  const keys = Object.keys(value);
  if (keys.length === 0) return false;

  let sawString = false;
  for (const key of keys) {
    if (!LOCALE_KEY_SET.has(key)) return false;
    const v = (value as Record<string, unknown>)[key];
    if (v === null) continue;
    if (typeof v !== 'string') return false;
    sawString = true;
  }
  return sawString;
}
