import { extensionForImageMime, REMOTE_IMAGE_MAX_BYTES } from './storage.interface';

export interface DownloadedImage {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  size: number;
}

/**
 * Fetch a remote image into memory with the guardrails the storage layer
 * needs before writing it anywhere: a hard timeout, an image-only Content-Type
 * check (so an HTML error page is never mirrored as a "photo"), and a size
 * cap. Shared by every StorageService implementation so the validation rules
 * live in exactly one place.
 */
export async function downloadRemoteImage(
  url: string,
  signal?: AbortSignal,
  timeoutMs = 20_000,
): Promise<DownloadedImage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  // Abort if either the caller's run-level signal or our local timeout fires.
  const onParentAbort = () => controller.abort();
  signal?.addEventListener('abort', onParentAbort, { once: true });

  try {
    const res = await fetch(url, { signal: controller.signal });
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
