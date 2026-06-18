export interface UploadResult {
  filePath: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/** Options for mirroring a remote image (SSRF allowlist + cancellation). */
export interface UploadFromUrlOptions {
  signal?: AbortSignal;
  /** Host allowlist enforced by the SSRF gate (empty → allowlist disabled). */
  allowedHosts?: string[];
}

export interface StorageService {
  upload(
    file: Express.Multer.File,
    directory: string,
  ): Promise<UploadResult>;
  /**
   * Download a remote image URL and self-host it (CRM feeds forbid
   * hotlinking). The SSRF gate (host allowlist + private-address block +
   * controlled redirects) runs first; then it validates the response is an
   * image, caps the size, and stores it under `directory` with a fresh uuid
   * key — same return shape as `upload`. Throws on a blocked URL, non-OK
   * responses, non-image content, or oversize payloads so the caller can
   * record the failure and move on.
   */
  uploadFromUrl(
    url: string,
    directory: string,
    options?: UploadFromUrlOptions,
  ): Promise<UploadResult>;
  delete(filePath: string): Promise<void>;
  getPublicUrl(filePath: string): string;
}

/** Cap on remotely-mirrored images (REBS full_images are ≤1920×1080 JPEGs). */
export const REMOTE_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

/** Map a response Content-Type to a file extension for the storage key. */
export function extensionForImageMime(mime: string): string | null {
  switch (mime.split(';')[0].trim().toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/avif':
      return '.avif';
    case 'image/gif':
      return '.gif';
    default:
      return null;
  }
}
