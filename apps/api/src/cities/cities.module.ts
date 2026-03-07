import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    UploadsModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [CitiesController],
  providers: [CitiesService],
})
export class CitiesModule {}
