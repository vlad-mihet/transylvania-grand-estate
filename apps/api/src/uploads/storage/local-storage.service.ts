import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { StorageService, UploadResult } from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageService {
  private uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = configService.get('UPLOAD_DIR', './uploads');
  }

  async upload(
    file: Express.Multer.File,
    directory: string,
  ): Promise<UploadResult> {
    const ext = path.extname(file.originalname);
    const filename = `${uuid()}${ext}`;
    const dirPath = path.join(this.uploadDir, directory);
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(directory, filename);
    await fs.writeFile(path.join(this.uploadDir, filePath), file.buffer);
    return {
      filePath,
      publicUrl: this.getPublicUrl(filePath),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async delete(filePath: string): Promise<void> {
    await fs
      .unlink(path.join(this.uploadDir, filePath))
      .catch(() => {});
  }

  getPublicUrl(filePath: string): string {
    return `/uploads/${filePath}`;
  }
}
