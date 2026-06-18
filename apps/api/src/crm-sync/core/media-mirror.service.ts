import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CanonicalListingInput } from '@tge/types';
import { UploadsService } from '../../uploads/uploads.service';
import { backfillLocalized, LocalizedValue } from './enrich.util';

/** Storage directory shared with admin-uploaded property images. */
const PROPERTY_IMAGE_DIR = 'properties';

/** An existing mirrored image we can reuse without re-downloading. */
export interface ExistingMirror {
  sourceUrl: string;
  storageKey: string | null;
  src: string;
}

/** A resolved image row ready to persist against a Property. */
export interface DesiredImageRow {
  src: string;
  storageKey: string | null;
  sourceUrl: string;
  isHero: boolean;
  sortOrder: number;
  alt: LocalizedValue;
}

export interface MirrorResult {
  rows: DesiredImageRow[];
  /** R2/local keys of previously-mirrored images dropped from the feed. */
  obsoleteStorageKeys: string[];
  stats: { downloaded: number; reused: number; failed: number };
}

/**
 * Mirrors a listing's CRM images into our own storage (hotlinking is
 * forbidden). Dedupe key is the source URL: REBS image URLs are stable, so a
 * URL already mirrored is reused as-is (no re-download); only new URLs are
 * fetched. Images that have left the feed surface as `obsoleteStorageKeys` for
 * the caller to clean up. A single image that fails to download is skipped
 * (logged) — one broken photo never fails the whole listing.
 */
@Injectable()
export class MediaMirrorService {
  private readonly logger = new Logger(MediaMirrorService.name);
  /** SSRF allowlist for image hosts (the mirror downloads feed-supplied URLs). */
  private readonly allowedHosts: string[];

  constructor(
    private readonly uploads: UploadsService,
    config: ConfigService,
  ) {
    this.allowedHosts = (config.get<string>('CRM_IMAGE_HOST_ALLOWLIST') ?? '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
  }

  async mirror(
    listing: CanonicalListingInput,
    existing: ExistingMirror[],
    signal: AbortSignal,
  ): Promise<MirrorResult> {
    const existingByUrl = new Map<string, ExistingMirror>();
    for (const e of existing) existingByUrl.set(e.sourceUrl, e);

    const fallbackAlt = backfillLocalized(listing.title).value;
    const rows: DesiredImageRow[] = [];
    const stats = { downloaded: 0, reused: 0, failed: 0 };
    const seenUrls = new Set<string>();

    for (const img of listing.images) {
      if (seenUrls.has(img.sourceUrl)) continue; // de-dupe within the feed
      seenUrls.add(img.sourceUrl);

      const alt = img.alt ? backfillLocalized(img.alt).value : fallbackAlt;
      const reuse = existingByUrl.get(img.sourceUrl);

      if (reuse) {
        rows.push({
          src: reuse.src,
          storageKey: reuse.storageKey,
          sourceUrl: img.sourceUrl,
          isHero: img.isHero,
          sortOrder: img.sortOrder,
          alt,
        });
        stats.reused++;
        continue;
      }

      try {
        const result = await this.uploads.uploadFromUrl(
          img.sourceUrl,
          PROPERTY_IMAGE_DIR,
          { signal, allowedHosts: this.allowedHosts },
        );
        rows.push({
          src: result.publicUrl,
          storageKey: result.filePath,
          sourceUrl: img.sourceUrl,
          isHero: img.isHero,
          sortOrder: img.sortOrder,
          alt,
        });
        stats.downloaded++;
      } catch (err) {
        stats.failed++;
        this.logger.warn(
          `failed to mirror image ${img.sourceUrl} for ` +
            `${listing.source}:${listing.externalId}: ${
              err instanceof Error ? err.message : 'unknown error'
            }`,
        );
      }
    }

    // Anything previously mirrored but no longer in the feed is obsolete.
    const obsoleteStorageKeys: string[] = [];
    for (const e of existing) {
      if (!seenUrls.has(e.sourceUrl) && e.storageKey) {
        obsoleteStorageKeys.push(e.storageKey);
      }
    }

    return { rows, obsoleteStorageKeys, stats };
  }

  /** Best-effort cleanup of orphaned storage objects (never throws). */
  async deleteObjects(storageKeys: string[]): Promise<void> {
    await Promise.all(
      storageKeys.map((key) =>
        this.uploads.deleteFile(key).catch(() => undefined),
      ),
    );
  }
}
