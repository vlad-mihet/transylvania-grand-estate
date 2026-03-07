export interface UploadResult {
  filePath: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface StorageService {
  upload(
    file: Express.Multer.File,
    directory: string,
  ): Promise<UploadResult>;
  delete(filePath: string): Promise<void>;
  getPublicUrl(filePath: string): string;
}
