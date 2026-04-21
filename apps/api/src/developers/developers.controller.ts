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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { IMAGE_UPLOAD_SINGLE } from '../common/config/upload.config';
import { ValidateUploadInterceptor } from '../common/interceptors/validate-upload.interceptor';
import { DevelopersService } from './developers.service';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { UpdateDeveloperDto } from './dto/update-developer.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentSite, SiteContext } from '../common/site';

@ApiTags('Developers')
@Controller('developers')
export class DevelopersController {
  constructor(private developersService: DevelopersService) {}

  @Public()
  @Get()
  async findAll(
    @CurrentSite() site: SiteContext,
    @Query('featured') featured?: boolean,
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.developersService.findAll(
      {
        featured,
        city,
        search,
        sort,
        page,
        limit,
      },
      site,
    );
  }

  @Public()
  @Get('id/:id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSite() site: SiteContext,
  ) {
    return this.developersService.findById(id, site);
  }

  @Public()
  @Get(':slug')
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentSite() site: SiteContext,
  ) {
    return this.developersService.findBySlug(slug, site);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post()
  async create(@Body() dto: CreateDeveloperDto) {
    return this.developersService.create(dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDeveloperDto) {
    return this.developersService.update(id, dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.developersService.remove(id);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('logo', IMAGE_UPLOAD_SINGLE),
    ValidateUploadInterceptor,
  )
  async uploadLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.developersService.uploadLogo(id, file);
  }
}
