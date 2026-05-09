import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { fromBuffer } from 'file-type';
import * as path from 'path';

/**
 * Magic-byte allowlist for academy lesson attachments. Mirrors the
 * image interceptor pattern but for documents — the upstream Multer
 * fileFilter only checks the client-supplied mimetype which is
 * trivially spoofable, so this interceptor is the authoritative
 * validator that runs after the buffer lands.
 *
 * Plain `.txt` is special: file-type can't fingerprint a text file
 * (no magic bytes), so we accept text/plain when fingerprinting
 * returns null AND the declared mimetype is text/plain. This matches
 * the upload-config allowlist's intent without weakening the
 * binary-format checks.
 */
const ALLOWED_DOC_MIMES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/msword': '.doc',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    '.pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'text/plain': '.txt',
};

@Injectable()
export class ValidateDocumentUploadInterceptor implements NestInterceptor {
  async intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = ctx.switchToHttp().getRequest<{
      file?: Express.Multer.File;
    }>();
    if (req.file) await this.validateAndNormalize(req.file);
    return next.handle();
  }

  private async validateAndNormalize(
    file: Express.Multer.File,
  ): Promise<void> {
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Empty attachment');
    }
    const detected = await fromBuffer(file.buffer);
    let resolvedMime: string;

    if (!detected) {
      // file-type returns null on text-only files. Trust the client's
      // mimetype only when it claims text/plain; everything else with
      // unrecognisable magic bytes is rejected.
      if (file.mimetype !== 'text/plain') {
        throw new BadRequestException('Unrecognised file content');
      }
      resolvedMime = 'text/plain';
    } else if (!ALLOWED_DOC_MIMES.has(detected.mime)) {
      throw new BadRequestException('Unsupported attachment format');
    } else {
      resolvedMime = detected.mime;
    }

    file.mimetype = resolvedMime;
    const base = path.basename(
      file.originalname,
      path.extname(file.originalname),
    );
    file.originalname = `${base}${MIME_TO_EXT[resolvedMime] ?? ''}`;
  }
}
