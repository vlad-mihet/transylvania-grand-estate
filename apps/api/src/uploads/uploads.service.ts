import { Inject, Injectable } from '@nestjs/common';
import { StorageService, UploadResult } from './storage/storage.interface';

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

  async deleteFile(filePath: string): Promise<void> {
    return this.storageService.delete(filePath);
  }

  getPublicUrl(filePath: string): string {
    return this.storageService.getPublicUrl(filePath);
  }
}
