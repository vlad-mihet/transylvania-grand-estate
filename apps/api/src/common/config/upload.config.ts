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

/**
 * Document allowlist for academy lesson attachments — handouts, slide
 * decks, exercise zips. Office formats are admitted because Romanian
 * agency content commonly ships as .docx / .pptx; PDFs and ZIPs cover
 * the rest. Plain text is included for completeness (cheat sheets,
 * checklists). Excel-style .xlsx is intentionally OUT until there's a
 * concrete academy use case — every additional format expands the
 * magic-byte validator's surface area.
 */
const DOCUMENT_MIME_REGEX =
  /^(application\/(pdf|zip|x-zip-compressed|msword|vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\.(presentationml\.presentation|wordprocessingml\.document))|text\/plain)$/;

/**
 * 25 MB cap matches the Resend attachment limit, keeps the upload UX
 * snappy on residential connections, and stays well clear of the
 * platform's request body limit. Lesson attachments are deliberately
 * single-file uploads — admins add more by repeating the action,
 * which keeps the magic-byte validator's failure mode obvious.
 */
export const DOCUMENT_UPLOAD_SINGLE: MulterOptions = {
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!DOCUMENT_MIME_REGEX.test(file.mimetype)) {
      return cb(
        new BadRequestException(
          'Unsupported attachment format. Allowed: PDF, ZIP, PPT/PPTX, DOC/DOCX, TXT.',
        ),
        false,
      );
    }
    cb(null, true);
  },
};

export const ATTACHMENTS_PER_LESSON_CAP = 10;
