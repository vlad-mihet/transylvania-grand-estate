import { Global, Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

/**
 * Global so services can inject `MetricsService` without importing this
 * module everywhere. The registry is a singleton \u2014 concurrent Nest
 * submodules that try to register duplicate metric names would otherwise
 * collide.
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
