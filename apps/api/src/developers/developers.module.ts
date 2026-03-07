import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DevelopersController } from './developers.controller';
import { DevelopersService } from './developers.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    UploadsModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [DevelopersController],
  providers: [DevelopersService],
})
export class DevelopersModule {}
