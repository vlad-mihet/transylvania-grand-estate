import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { MetricsService } from './metrics.service';

/**
 * Prometheus scrape endpoint. Two-tier feature flag:
 *   1. If `METRICS_BEARER_TOKEN` is unset, return 404 \u2014 metrics are fully
 *      disabled for this deployment. Operators opt in by setting the var.
 *   2. When enabled, require a matching Bearer token. Metrics leak usage
 *      patterns (login counts, email volume) that we don't want public.
 *
 * No rate limiting: Prometheus scrapes at a predictable cadence, and the
 * bearer check means randos can't hit it anyway.
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  @Public()
  @Get()
  async scrape(
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: Response,
  ) {
    const required = this.config.get<string>('METRICS_BEARER_TOKEN');
    if (!required) {
      throw new NotFoundException();
    }
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    if (!token || !timingSafeEqual(token, required)) {
      throw new UnauthorizedException();
    }
    res.setHeader('Content-Type', this.metrics.registry.contentType);
    res.send(await this.metrics.serialize());
  }
}

/**
 * Constant-time string compare so a wrong-token response time doesn't leak
 * the correct prefix length. Doesn't matter cryptographically for a secret
 * this short (the scrape endpoint is low-value), but the hygiene is cheap.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
