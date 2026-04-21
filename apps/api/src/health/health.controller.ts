import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Two probes, two purposes:
 *
 *   - `/health/live` — "Is the Node process responsive?" No DB hit. Load
 *     balancers / Fly check this cheaply + frequently to decide whether to
 *     keep the VM alive. Always returns 200 once the event loop is running.
 *   - `/health/ready` — "Can this instance serve traffic right now?" Touches
 *     Postgres. Returns 503 on DB failure so orchestrators can pull the VM
 *     out of the rotation during transient outages instead of sending it
 *     requests it can't fulfil.
 *
 * The legacy `/health` and `/health/db` endpoints are kept as aliases so
 * existing monitors don't break during the rollover.
 */
@ApiTags('Health')
@Controller('health')
@Public()
@SkipThrottle()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  root() {
    return this.live();
  }

  @Get('live')
  live() {
    return {
      ok: true,
      uptime: process.uptime(),
      version: process.env.APP_VERSION ?? 'dev',
    };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        ok: true,
        uptime: process.uptime(),
        version: process.env.APP_VERSION ?? 'dev',
      };
    } catch (err) {
      throw new HttpException(
        {
          ok: false,
          reason: 'database-unreachable',
          message:
            err instanceof Error ? err.message : 'Database probe failed',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /** Legacy alias — prefer /health/ready for new monitors. */
  @Get('db')
  async db() {
    return this.ready();
  }
}
