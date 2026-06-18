import { Inject, Injectable } from '@nestjs/common';
import {
  StorageService,
  UploadFromUrlOptions,
  UploadResult,
} from './storage/storage.interface';

@Injectable()
export class UploadsService {
  constructor(
    @Inject('STORAGE_SERVICE')
    private storageService: StorageService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    directory: string,
  ): Promise<UploadResult> {
    return this.storageService.upload(file, directory);
  }

  async uploadFiles(
    files: Express.Multer.File[],
    directory: string,
  ): Promise<UploadResult[]> {
    return Promise.all(files.map((file) => this.storageService.upload(file, directory)));
  }

  /**
   * Mirror a remote image URL into our own storage (CRM feeds forbid
   * hotlinking). Returns the same `UploadResult` shape as a multipart upload;
   * `filePath` is the storage key to persist for later cleanup.
   */
  async uploadFromUrl(
    url: string,
    directory: string,
    options?: UploadFromUrlOptions,
  ): Promise<UploadResult> {
    return this.storageService.uploadFromUrl(url, directory, options);
  }

  async deleteFile(filePath: string): Promise<void> {
    return this.storageService.delete(filePath);
  }

  getPublicUrl(filePath: string): string {
    return this.storageService.getPublicUrl(filePath);
  }

  /**
   * Recover a storage key from a previously-issued public URL so consumers
   * can hand it back to `deleteFile` on replace/destroy.
   *
   * Two URL shapes get round-tripped:
   *  - Local dev:  `/uploads/<directory>/<file>`
   *  - R2 prod:    `https://<r2-host>/<directory>/<file>`
   *
   * Returns `null` when the URL doesn't belong to this storage layer (seed-
   * baked `/images/...` paths, externally-pasted URLs, empty strings, or
   * URLs whose first path segment doesn't match the caller's directory).
   * Anchoring on `/uploads/<dir>/` or the first URL path segment is what
   * keeps `/images/cities/placeholder.jpg` from being mistaken for a real
   * cities upload — naive substring search would feed the storage layer a
   * bogus key.
   */
  extractStoragePath(
    url: string | null | undefined,
    directory: string,
  ): string | null {
    if (!url) return null;

    // Local dev: anchor on the literal `/uploads/<dir>/` marker so unrelated
    // paths that happen to contain `<dir>/` (e.g. `/images/cities/...`) don't
    // match.
    const localPrefix = '/uploads/';
    const localMarker = `${localPrefix}${directory}/`;
    const localIdx = url.indexOf(localMarker);
    if (localIdx >= 0) return url.slice(localIdx + localPrefix.length);

    // Absolute (R2): the directory must be the first path segment after the
    // host. `URL` rejects relative inputs, which is what we want — relative
    // strings already had their shot above.
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.replace(/^\//, '');
      if (path === `${directory}` || path.startsWith(`${directory}/`)) {
        return path;
      }
    } catch {
      // Not a parseable absolute URL — fall through to null.
    }

    return null;
  }

  /**
   * Convenience wrapper: extract the storage path and delete in one call.
   * Best-effort — swallows errors so cleanup never blocks the caller's main
   * operation. Use when the URL/directory are known and the delete is a
   * trailing side-effect after a successful primary write.
   */
  async deleteByPublicUrl(
    url: string | null | undefined,
    directory: string,
  ): Promise<void> {
    const storagePath = this.extractStoragePath(url, directory);
    if (!storagePath) return;
    await this.deleteFile(storagePath).catch(() => undefined);
  }
}
