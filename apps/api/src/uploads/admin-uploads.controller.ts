import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { IMAGE_UPLOAD_SINGLE } from '../common/config/upload.config';
import { ValidateUploadInterceptor } from '../common/interceptors/validate-upload.interceptor';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadsService } from './uploads.service';

/**
 * Editor-only inline image uploads, used by the Tiptap content editor on
 * articles + academy lessons. Distinct from the per-entity cover-image
 * routes (which are gated by the resource's own role policy and stored
 * under per-resource directories): this endpoint accepts an unbound image
 * and returns a public URL the editor inserts into the markdown content.
 *
 * Storage path: `inline-content/<storage-generated-name>`. The image lives
 * forever (no orphan cleanup yet); a follow-up sweep can prune URLs that
 * don't appear in any published article or lesson body.
 *
 * Returns the public URL plus minimal metadata so the client can size the
 * inserted node. Width/height are NOT computed server-side — `sharp` is
 * already a workspace dependency but I/O on every upload feels heavy for
 * the marginal UX win; the browser lays out images by natural dimensions
 * once they load. Add server-side dimensions if a future feature (e.g.
 * Cloudinary-style resize hints) demands them.
 */
@ApiTags('AdminUploads')
@Controller('admin/uploads')
@Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
export class AdminUploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('inline-images')
  @UseInterceptors(
    FileInterceptor('image', IMAGE_UPLOAD_SINGLE),
    ValidateUploadInterceptor,
  )
  async uploadInlineImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No file received — attach it to the `image` field',
      );
    }
    const result = await this.uploadsService.uploadFile(file, 'inline-content');
    return {
      url: result.publicUrl,
      mimeType: result.mimeType,
      size: result.size,
    };
  }
}
