import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageService } from './storage/local-storage.service';
import { R2StorageService } from './storage/r2-storage.service';
import { UploadsService } from './uploads.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'STORAGE_SERVICE',
      useFactory: (configService: ConfigService) => {
        const storageType = configService.get('STORAGE_TYPE', 'local');
        if (storageType === 'r2') {
          return new R2StorageService(configService);
        }
        return new LocalStorageService(configService);
      },
      inject: [ConfigService],
    },
    UploadsService,
  ],
  exports: ['STORAGE_SERVICE', UploadsService],
})
export class UploadsModule {}
