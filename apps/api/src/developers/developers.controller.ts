import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DevelopersService } from './developers.service';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { UpdateDeveloperDto } from './dto/update-developer.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('developers')
export class DevelopersController {
  constructor(private developersService: DevelopersService) {}

  @Public()
  @Get()
  async findAll(
    @Query('featured') featured?: boolean,
    @Query('city') city?: string,
  ) {
    return this.developersService.findAll({ featured, city });
  }

  @Public()
  @Get('id/:id')
  async findById(@Param('id') id: string) {
    return this.developersService.findById(id);
  }

  @Public()
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.developersService.findBySlug(slug);
  }

  @Post()
  async create(@Body() dto: CreateDeveloperDto) {
    return this.developersService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDeveloperDto) {
    return this.developersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.developersService.remove(id);
  }

  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|svg\+xml)$/)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.developersService.uploadLogo(id, file);
  }
}
