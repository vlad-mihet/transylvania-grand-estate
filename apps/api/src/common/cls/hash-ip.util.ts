import { createHash } from 'node:crypto';

/**
 * Hash a raw IP with a server-side pepper so audit rows can correlate the
 * same actor across requests for forensic review without ever persisting a
 * raw IP (GDPR: PII minimisation). Returns null when either input is missing
 * — caller stores null rather than a meaningless hash of the empty string.
 *
 * Pepper rotation is destructive on purpose: rotating AUDIT_IP_PEPPER breaks
 * cross-window IP correlation but does not leak any prior raw IP.
 */
export function hashIp(rawIp: string | undefined | null): string | null {
  if (!rawIp) return null;
  const pepper = process.env.AUDIT_IP_PEPPER;
  if (!pepper) return null;
  return createHash('sha256').update(`${rawIp}${pepper}`).digest('hex');
}
