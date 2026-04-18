import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolveUploadsDir } from './common/config/uploads-path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { DevelopersModule } from './developers/developers.module';
import { AgentsModule } from './agents/agents.module';
import { CitiesModule } from './cities/cities.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { SiteConfigModule } from './site-config/site-config.module';
import { UploadsModule } from './uploads/uploads.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { ArticlesModule } from './articles/articles.module';
import { CountiesModule } from './counties/counties.module';
import { LocationsModule } from './locations/locations.module';
import { FinancialDataModule } from './financial-data/financial-data.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SiteModule, SiteMiddleware } from './common/site';

// Local dev serves uploaded images from disk; production proxies R2 directly.
// rootPath must match wherever LocalStorageService writes — resolveUploadsDir
// is the single source of truth for that, so the two never drift. A
// restrictive CSP header is attached so any image that ever slips the
// magic-byte filter (Critical #3) cannot execute script against our origin.
const serveStaticBootLogger = new Logger('ServeStatic');
const serveStaticModules =
  process.env.STORAGE_TYPE !== 'r2'
    ? [
        ServeStaticModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            const rootPath = resolveUploadsDir(config);
            serveStaticBootLogger.log(`Serving uploads from ${rootPath}`);
            return [
              {
                rootPath,
                serveRoot: '/uploads',
                serveStaticOptions: {
                  setHeaders: (res: ServerResponse) => {
                    res.setHeader(
                      'Content-Security-Policy',
                      "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
                    );
                  },
                },
              },
            ];
          },
        }),
      ]
    : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Structured logging with per-request correlation IDs. pino-http assigns
    // `req.id` and echoes `x-request-id` on every response; the id also flows
    // into `HttpExceptionFilter`'s error body so a client can quote it when
    // reporting a bug. In dev we pretty-print; in prod we emit raw JSON so
    // log aggregators (Loki/Axiom/CloudWatch) can index it directly.
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL', 'info'),
          genReqId: (req: IncomingMessage, res: ServerResponse) => {
            const existing = req.headers['x-request-id'];
            const id =
              typeof existing === 'string' && existing.length <= 128
                ? existing
                : randomUUID();
            res.setHeader('x-request-id', id);
            return id;
          },
          transport:
            process.env.NODE_ENV !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss.l',
                    singleLine: true,
                  },
                }
              : undefined,
          // Reduce noise: skip asset + health-like paths from HTTP logs.
          autoLogging: {
            ignore: (req) =>
              req.url?.startsWith('/uploads/') === true ||
              req.url === '/api/v1/health',
          },
        },
      }),
    }),
    ScheduleModule.forRoot(),
    // Global baseline: 60 requests / minute / IP. Per-endpoint decorators
    // (e.g. @Throttle on auth/login, inquiries) can tighten this further.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ...serveStaticModules,
    SiteModule,
    PrismaModule,
    AuthModule,
    PropertiesModule,
    DevelopersModule,
    AgentsModule,
    CitiesModule,
    TestimonialsModule,
    SiteConfigModule,
    UploadsModule,
    InquiriesModule,
    ArticlesModule,
    CountiesModule,
    LocationsModule,
    FinancialDataModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SiteMiddleware).forRoutes('*');
  }
}
