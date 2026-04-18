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

// Magic-byte allowlist. Intentionally excludes SVG — SVGs can carry inline
// JavaScript and all upload surfaces here serve public images. The
// `upload.config.ts` fileFilter checks only the client-supplied mime header,
// which a malicious caller can trivially spoof; this interceptor is the
// authoritative validator that runs after Multer has buffered the file.
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

@Injectable()
export class ValidateUploadInterceptor implements NestInterceptor {
  async intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = ctx.switchToHttp().getRequest<{
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
    }>();

    const files = this.collectFiles(req);
    for (const file of files) {
      await this.validateAndNormalize(file);
    }

    return next.handle();
  }

  private collectFiles(req: {
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
  }): Express.Multer.File[] {
    const out: Express.Multer.File[] = [];
    if (req.file) out.push(req.file);
    if (Array.isArray(req.files)) {
      out.push(...req.files);
    } else if (req.files && typeof req.files === 'object') {
      for (const key of Object.keys(req.files)) {
        out.push(...req.files[key]);
      }
    }
    return out;
  }

  private async validateAndNormalize(file: Express.Multer.File): Promise<void> {
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Invalid image content');
    }
    const detected = await fromBuffer(file.buffer);
    if (!detected || !ALLOWED_MIMES.has(detected.mime)) {
      throw new BadRequestException('Invalid image content');
    }
    // Overwrite the client-supplied mimetype with the validated value and
    // re-suffix originalname with the canonical extension, so downstream
    // code that calls `path.extname(file.originalname)` (see
    // `local-storage.service.ts`) cannot be tricked into writing a `.svg`
    // file.
    file.mimetype = detected.mime;
    const base = path.basename(
      file.originalname,
      path.extname(file.originalname),
    );
    file.originalname = `${base}${MIME_TO_EXT[detected.mime]}`;
  }
}
