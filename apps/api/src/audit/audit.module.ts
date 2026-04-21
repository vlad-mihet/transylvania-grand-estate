import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditHealthService } from './audit.health';

/**
 * Global so the `AuditInterceptor` (which lives in `common/`) can inject
 * `AuditService` without every feature module needing to re-import it.
 * `AuditHealthService` is exported alongside so the controller's health
 * endpoint and any future external probe can read the same counter.
 */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditHealthService],
  exports: [AuditService, AuditHealthService],
})
export class AuditModule {}
