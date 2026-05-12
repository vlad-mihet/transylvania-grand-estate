import { Global, Module } from '@nestjs/common';

/**
 * Holds nothing today — `LocaleMiddleware` is wired in `AppModule.configure`
 * (same shape as `SiteMiddleware`), and the decorator + interceptor are
 * pure constructs without DI dependencies. The module exists as a
 * conventional anchor so future locale-related providers (a metrics
 * sub-collector, a per-request formatter cache) have a natural home.
 */
@Global()
@Module({})
export class LocaleModule {}
