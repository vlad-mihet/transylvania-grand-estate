import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { DevelopersModule } from './developers/developers.module';
import { CitiesModule } from './cities/cities.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { SiteConfigModule } from './site-config/site-config.module';
import { UploadsModule } from './uploads/uploads.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

const serveStaticModules =
  process.env.STORAGE_TYPE !== 'r2'
    ? [
        ServeStaticModule.forRoot({
          rootPath: join(__dirname, '..', '..', 'uploads'),
          serveRoot: '/uploads',
        }),
      ]
    : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ...serveStaticModules,
    PrismaModule,
    AuthModule,
    PropertiesModule,
    DevelopersModule,
    CitiesModule,
    TestimonialsModule,
    SiteConfigModule,
    UploadsModule,
    InquiriesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
