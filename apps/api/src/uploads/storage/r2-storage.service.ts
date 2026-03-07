import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import { StorageService, UploadResult } from './storage.interface';

@Injectable()
export class R2StorageService implements StorageService {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    this.bucket = configService.get('R2_BUCKET', '');
    this.publicUrl = configService.get('R2_PUBLIC_URL', '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: configService.get('R2_ENDPOINT', ''),
      credentials: {
        accessKeyId: configService.get('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: configService.get('R2_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async upload(
    file: Express.Multer.File,
    directory: string,
  ): Promise<UploadResult> {
    const ext = path.extname(file.originalname);
    const filename = `${uuid()}${ext}`;
    const key = `${directory}/${filename}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      filePath: key,
      publicUrl: this.getPublicUrl(key),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async delete(filePath: string): Promise<void> {
    await this.s3
      .send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: filePath,
        }),
      )
      .catch(() => {});
  }

  getPublicUrl(filePath: string): string {
    return `${this.publicUrl}/${filePath}`;
  }
}
