import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SmartValidationPipe } from './common/pipes/smart-validation.pipe';
import { initSentry } from './common/sentry/sentry.init';
import { DEV_ORIGIN_LIST } from './common/site/dev-origins';

async function bootstrap() {
  // Sentry before NestFactory so bootstrap failures (including env validation
  // errors from ConfigModule) get captured too. No-op when SENTRY_DSN is
  // unset (dev + not-yet-configured prod).
  const sentryEnabled = initSentry();

  // Env validation runs inside ConfigModule.forRoot via the `validate`
  // callback in app.module.ts — Nest loads .env then invokes validateEnv,
  // so the Zod-parsed object (with defaults) backs ConfigService.

  // rawBody=true exposes `req.rawBody` via `@Req() RawBodyRequest<Request>` so
  // the Resend webhook controller can hash-verify the exact bytes Svix signed.
  // Parsed JSON would canonicalise key order and lose the byte-for-byte match.
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(Logger));

  // Nest's SIGTERM/SIGINT handler — drains in-flight requests and closes the
  // Prisma pool before the process exits. Fly.io sends SIGINT on deploy; this
  // prevents "connection reset" mid-request during rolling releases.
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  // Trust the first reverse proxy so X-Forwarded-For is used by ThrottlerGuard
  // for per-IP rate limiting (Fly.io / Nginx / Cloudflare typically set it).
  app.getHttpAdapter().getInstance().set?.('trust proxy', 1);

  // Baseline security headers. `contentSecurityPolicy: false` — the API
  // serves JSON + uploaded images with a per-upload CSP in app.module.ts;
  // a global CSP would break those. `crossOriginResourcePolicy: cross-origin`
  // lets the admin + public sites load uploaded images.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS: require CORS_ORIGINS to be explicit in production. Dev falls back to
  // the local Next.js ports (landing:3050, admin:3051, reveria:3052) so fresh
  // clones work without extra setup.
  const corsOriginsRaw = configService.get<string>('CORS_ORIGINS');
  if (!corsOriginsRaw && process.env.NODE_ENV === 'production') {
    throw new Error(
      'CORS_ORIGINS must be set in production (comma-separated origin list)',
    );
  }
  const corsOrigins = (corsOriginsRaw ?? DEV_ORIGIN_LIST.join(','))
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (corsOrigins.length === 0) {
    // Guard against a value like `",,  "` slipping through in prod — an
    // empty list would silently permit nothing and all browser requests
    // would 4xx with opaque failures.
    throw new Error(
      'CORS_ORIGINS resolved to an empty list after trimming; check the env value',
    );
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Site', 'X-Request-Id'],
  });

  // Routes Zod DTOs to ZodValidationPipe and class-validator DTOs to the
  // existing ValidationPipe config. Incremental migration path — see
  // apps/api/src/common/pipes/smart-validation.pipe.ts.
  app.useGlobalPipes(
    new SmartValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Transylvania Grand Estate API')
    .setDescription('Backend API for luxury real estate management')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication & session refresh')
    .addTag('Properties', 'Property listings & admin CRUD')
    .addTag('Developers', 'Developer profiles')
    .addTag('Agents', 'Agent profiles')
    .addTag('Cities', 'City pages & hero content')
    .addTag('Counties', 'Romanian județe reference data')
    .addTag('Locations', 'Geocoding-friendly location lookup')
    .addTag('Testimonials', 'Client testimonials')
    .addTag('Articles', 'Blog / editorial content')
    .addTag('Inquiries', 'Lead capture & admin triage')
    .addTag('Site Config', 'Per-site branding & feature toggles')
    .addTag('Financial Data', 'FX / mortgage / rental-yield reference data')
    .addTag('Audit', 'Administrative audit log (SUPER_ADMIN)')
    .addTag('Health', 'Liveness & readiness probe')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 3333);
  await app.listen(port, '0.0.0.0');
  const logger = app.get(Logger);
  logger.log(`API running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  logger.log(`CORS origins: ${corsOrigins.join(', ')}`);
  if (sentryEnabled) logger.log('Sentry error reporting enabled');
}

bootstrap();
