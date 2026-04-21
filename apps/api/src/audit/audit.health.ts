import { Injectable } from '@nestjs/common';

/**
 * In-process counter for audit-write failures. Lives outside of AuditService
 * so the controller can read it without dragging the whole service into a
 * health endpoint. Counts reset on process restart by design — long-term
 * trending belongs in pino + an external metrics pipeline; this widget
 * exists to flag "audit is broken right now" on the admin dashboard.
 *
 * Multi-process / clustered deploys: each instance has its own counter.
 * The dashboard widget reports per-instance state, which is what an
 * operator wants when triaging a partial outage.
 */
@Injectable()
export class AuditHealthService {
  private failuresSinceBoot = 0;
  private lastFailureAt: Date | null = null;
  private lastError: string | null = null;
  private readonly bootedAt = new Date();

  recordFailure(err: unknown): void {
    this.failuresSinceBoot += 1;
    this.lastFailureAt = new Date();
    this.lastError = err instanceof Error ? err.message : String(err);
  }

  snapshot() {
    return {
      bootedAt: this.bootedAt.toISOString(),
      failuresSinceBoot: this.failuresSinceBoot,
      lastFailureAt: this.lastFailureAt?.toISOString() ?? null,
      lastError: this.lastError,
    };
  }
}
