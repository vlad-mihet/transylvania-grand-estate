import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE_NAME,
  negotiateLocale,
} from '@tge/locale';
import type { LocaleContext, LocaleSource } from './locale.types';

@Injectable()
export class LocaleMiddleware implements NestMiddleware {
  /**
   * Attach `req.locale` for every request. Precedence (highest → lowest):
   *
   *  1. **`?locale=`** query param — the canonical signal. Frontend SSR
   *     always passes this explicitly because the URL prefix tells it what
   *     the user is viewing. The query param is also what makes responses
   *     cacheable per locale at the CDN (URL is the cache key).
   *  2. **`Accept-Language`** header — for direct curl / API consumers that
   *     don't know the convention. Quality-value aware via
   *     `negotiateLocale`.
   *  3. **`NEXT_LOCALE` cookie** — last-resort, mostly for browser-direct
   *     hits to the API (rare; SSR always passes `?locale=`). Cookies on
   *     API responses are not maintained by the API itself; the cookie is
   *     a frontend signal that happens to also reach here when same-site.
   *  4. **`defaultLocale`** (RO) — fallback.
   *
   * The middleware is silent; observability is left to per-route logging.
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const resolved = this.resolve(req);
    req.locale = resolved;
    res.setHeader('X-Locale-Resolved', resolved.locale);
    next();
  }

  private resolve(req: Request): LocaleContext {
    const fromQuery = this.readQueryLocale(req);
    if (fromQuery) {
      return { locale: fromQuery, source: 'query' };
    }

    const accept = req.headers['accept-language'];
    if (typeof accept === 'string' && accept.length > 0) {
      const matched = negotiateLocale(accept, defaultLocale);
      // negotiateLocale returns `defaultLocale` even on no-match; only
      // attribute to Accept-Language when an actual match happened.
      const tagSeen = accept.toLowerCase();
      const matchedDeliberately =
        tagSeen.includes(matched) || matched !== defaultLocale;
      if (matchedDeliberately) {
        return { locale: matched, source: 'accept-language' };
      }
    }

    const fromCookie = this.readCookieLocale(req);
    if (fromCookie) {
      return { locale: fromCookie, source: 'cookie' };
    }

    return { locale: defaultLocale, source: 'default' };
  }

  private readQueryLocale(req: Request) {
    const raw = req.query.locale;
    if (typeof raw !== 'string') return null;
    return isLocale(raw) ? raw : null;
  }

  private readCookieLocale(req: Request) {
    // Express's cookie-parser may not be installed (the API generally talks
    // to first-party clients with auth headers). Read the raw header so we
    // don't depend on middleware order.
    const header = req.headers.cookie;
    if (typeof header !== 'string') return null;
    for (const segment of header.split(';')) {
      const [name, ...rest] = segment.trim().split('=');
      if (name === LOCALE_COOKIE_NAME) {
        const value = decodeURIComponent(rest.join('='));
        return isLocale(value) ? value : null;
      }
    }
    return null;
  }
}
