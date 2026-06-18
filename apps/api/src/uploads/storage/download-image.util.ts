import * as dns from 'node:dns/promises';
import * as net from 'node:net';
import { extensionForImageMime, REMOTE_IMAGE_MAX_BYTES } from './storage.interface';

export interface DownloadedImage {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  size: number;
}

export interface DownloadImageOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  /**
   * If non-empty, the URL host (and every redirect hop's host) must equal or be
   * a subdomain of one of these. Empty/undefined disables the allowlist but the
   * private-address block below always applies.
   */
  allowedHosts?: string[];
}

/** Cap redirect hops — each hop is re-validated against the SSRF rules. */
const MAX_REDIRECTS = 3;

function hostAllowed(hostname: string, allowedHosts?: string[]): boolean {
  if (!allowedHosts || allowedHosts.length === 0) return true;
  const h = hostname.toLowerCase().replace(/\.$/, '');
  return allowedHosts.some((a) => {
    const allow = a.toLowerCase().replace(/\.$/, '');
    return !!allow && (h === allow || h.endsWith(`.${allow}`));
  });
}

/** Block loopback / private / link-local (incl. cloud metadata) / reserved v4. */
function ipv4Blocked(ip: string): boolean {
  const parts = ip.split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // malformed → fail closed
  }
  const [a, b] = parts;
  if (a === 0) return true; // "this" network
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}

function ipBlocked(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) return ipv4Blocked(ip);
  if (kind === 6) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return true; // loopback / unspecified
    if (v.startsWith('fe80')) return true; // link-local
    if (v.startsWith('fc') || v.startsWith('fd')) return true; // ULA fc00::/7
    const mapped = v.match(/(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
    if (mapped) return ipv4Blocked(mapped[1]);
    return false;
  }
  return true; // not an IP literal — caller resolves DNS first
}

/**
 * Reject a URL before we fetch it: http(s) only, host on the allowlist, and —
 * crucially — not pointing at a private/loopback/link-local/metadata address.
 * Hostnames are DNS-resolved and every answer is checked (a literal IP is
 * checked directly). This is the SSRF gate; a small DNS-rebinding window remains
 * (we validate-then-connect by name), which the host allowlist closes for the
 * REBS case.
 */
async function assertSafeUrl(raw: string, allowedHosts?: string[]): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`invalid image URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`refusing non-http(s) image URL: ${raw}`);
  }
  if (!hostAllowed(url.hostname, allowedHosts)) {
    throw new Error(`image host "${url.hostname}" not in allowlist`);
  }

  if (net.isIP(url.hostname)) {
    if (ipBlocked(url.hostname)) {
      throw new Error(`refusing image URL at non-public address ${url.hostname}`);
    }
    return;
  }

  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(url.hostname, { all: true });
  } catch {
    throw new Error(`could not resolve image host "${url.hostname}"`);
  }
  if (addrs.length === 0) {
    throw new Error(`image host "${url.hostname}" resolved to nothing`);
  }
  for (const { address } of addrs) {
    if (ipBlocked(address)) {
      throw new Error(
        `image host "${url.hostname}" resolves to non-public address ${address}`,
      );
    }
  }
}

/**
 * Fetch a remote image into memory with the guardrails the storage layer needs
 * before writing it anywhere: SSRF gate (host allowlist + private-address
 * block + controlled redirects), a hard timeout, an image-only Content-Type
 * check (so an HTML error page is never mirrored as a "photo"), and a size cap.
 * Shared by every StorageService implementation so the rules live in one place.
 */
export async function downloadRemoteImage(
  url: string,
  options: DownloadImageOptions = {},
): Promise<DownloadedImage> {
  const { signal, timeoutMs = 20_000, allowedHosts } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  // Abort if either the caller's run-level signal or our local timeout fires.
  const onParentAbort = () => controller.abort();
  signal?.addEventListener('abort', onParentAbort, { once: true });

  try {
    // Follow redirects manually so every hop is re-validated against the SSRF
    // rules (an allowlisted host must not 302 us into the metadata service).
    let current = url;
    let res: Response;
    for (let hop = 0; ; hop++) {
      await assertSafeUrl(current, allowedHosts);
      res = await fetch(current, {
        signal: controller.signal,
        redirect: 'manual',
      });
      if (res.status >= 300 && res.status < 400) {
        if (hop >= MAX_REDIRECTS) {
          throw new Error(`too many redirects fetching ${url}`);
        }
        const location = res.headers.get('location');
        if (!location) {
          throw new Error(`redirect without Location fetching ${current}`);
        }
        current = new URL(location, current).toString();
        continue;
      }
      break;
    }

    if (!res.ok) {
      throw new Error(`image fetch returned ${res.status} for ${url}`);
    }

    const mimeType = res.headers.get('content-type') ?? '';
    const ext = extensionForImageMime(mimeType);
    if (!ext) {
      throw new Error(
        `refusing non-image content-type "${mimeType || 'unknown'}" for ${url}`,
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength === 0) {
      throw new Error(`empty image body for ${url}`);
    }
    if (buffer.byteLength > REMOTE_IMAGE_MAX_BYTES) {
      throw new Error(
        `image ${url} is ${buffer.byteLength} bytes, over the ${REMOTE_IMAGE_MAX_BYTES} cap`,
      );
    }

    return { buffer, mimeType, ext, size: buffer.byteLength };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onParentAbort);
  }
}
