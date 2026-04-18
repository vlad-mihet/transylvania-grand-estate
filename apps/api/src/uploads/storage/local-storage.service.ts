import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { resolveUploadsDir } from '../../common/config/uploads-path';
import { StorageService, UploadResult } from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = resolveUploadsDir(configService);
    this.logger.log(`Writing uploads to ${this.uploadDir}`);
  }

  async upload(
    file: Express.Multer.File,
    directory: string,
  ): Promise<UploadResult> {
    const ext = path.extname(file.originalname);
    const filename = `${uuid()}${ext}`;
    const dirPath = path.join(this.uploadDir, directory);
    await fs.mkdir(dirPath, { recursive: true });
    // URLs must use forward slashes regardless of OS; filesystem writes use
    // the platform-native separator. Keep the two strictly distinct.
    const urlPath = path.posix.join(directory, filename);
    const fsPath = path.join(directory, filename);
    await fs.writeFile(path.join(this.uploadDir, fsPath), file.buffer);
    return {
      filePath: urlPath,
      publicUrl: this.getPublicUrl(urlPath),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async delete(filePath: string): Promise<void> {
    // filePath arrives as a posix URL path; normalize to OS separators before
    // touching fs.
    const fsPath = filePath.split('/').join(path.sep);
    await fs
      .unlink(path.join(this.uploadDir, fsPath))
      .catch(() => {});
  }

  getPublicUrl(filePath: string): string {
    return `/uploads/${filePath}`;
  }
}
