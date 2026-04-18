import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Allowed image mime types across all upload endpoints. Deliberately does
 * NOT include `image/svg+xml` — SVGs can carry inline JavaScript so we reject
 * them on uncontrolled uploads (properties / agents / developers / cities
 * all upload user-supplied images that get served publicly).
 */
const IMAGE_MIME_ALLOWLIST = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

const MIME_REGEX = /^image\/(jpeg|jpg|png|webp|avif)$/;

export const IMAGE_UPLOAD_SINGLE: MulterOptions = {
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!MIME_REGEX.test(file.mimetype)) {
      return cb(
        new BadRequestException(
          `Only image files are allowed (${IMAGE_MIME_ALLOWLIST.join(', ')})`,
        ),
        false,
      );
    }
    cb(null, true);
  },
};

export const IMAGE_UPLOAD_MULTIPLE: MulterOptions = {
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: IMAGE_UPLOAD_SINGLE.fileFilter,
};

export const IMAGE_UPLOAD_MAX_FILES = 10;
