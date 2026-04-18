import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import {
  IMAGE_UPLOAD_MULTIPLE,
  IMAGE_UPLOAD_MAX_FILES,
} from '../common/config/upload.config';
import { ValidateUploadInterceptor } from '../common/interceptors/validate-upload.interceptor';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { UpdatePropertyImageDto } from './dto/update-property-image.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentSite, SiteContext } from '../common/site';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  @Public()
  @Get()
  async findAll(
    @Query() query: QueryPropertyDto,
    @CurrentSite() site: SiteContext,
  ) {
    return this.propertiesService.findAll(query, site);
  }

  @Public()
  @Get('map-pins')
  async findMapPins(
    @Query() query: QueryPropertyDto,
    @CurrentSite() site: SiteContext,
  ) {
    return this.propertiesService.findMapPins(query, site);
  }

  @Public()
  @Get('id/:id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSite() site: SiteContext,
  ) {
    return this.propertiesService.findById(id, site);
  }

  @Public()
  @Get(':slug')
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentSite() site: SiteContext,
  ) {
    return this.propertiesService.findBySlug(slug, site);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post()
  async create(@Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePropertyDto) {
    return this.propertiesService.update(id, dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.remove(id);
  }

  // Image management
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('images', IMAGE_UPLOAD_MAX_FILES, IMAGE_UPLOAD_MULTIPLE),
    ValidateUploadInterceptor,
  )
  async uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.propertiesService.addImages(id, files);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Patch(':id/images/:imageId')
  async updateImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdatePropertyImageDto,
  ) {
    return this.propertiesService.updateImage(id, imageId, dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id/images/:imageId')
  async removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.propertiesService.removeImage(id, imageId);
  }
}
