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
import { AdminRole, Brand } from '@prisma/client';
import { IMAGE_UPLOAD_SINGLE } from '../common/config/upload.config';
import { ValidateUploadInterceptor } from '../common/interceptors/validate-upload.interceptor';
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentSite, SiteContext } from '../common/site';

@ApiTags('Cities')
@Controller('cities')
export class CitiesController {
  constructor(private citiesService: CitiesService) {}

  @Public()
  @Get()
  async findAll(
    @CurrentSite() site: SiteContext,
    @Query('county') county?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('featured') featured?: string,
    @Query('brand') brand?: string,
  ) {
    // `featured` arrives as a string ("true"/"false") via Express query parsing.
    // Coerce to boolean only on the affirmative literal so a missing or
    // arbitrary value falls through to the default unfiltered listing.
    const featuredFlag = featured === 'true';
    // Admin-only brand override. "all" is the explicit no-op (matches the
    // admin BrandContextProvider's "all" state); anything else is validated
    // on the way in to keep the SQL safe.
    const brandFilter =
      brand === 'tge' || brand === 'revery' ? brand : undefined;
    return this.citiesService.findAll(
      {
        county,
        search,
        sort,
        page,
        limit,
        featured: featuredFlag,
        brand: brandFilter,
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
    return this.citiesService.findById(id, site);
  }

  @Public()
  @Get(':slug/neighborhoods')
  async findNeighborhoods(
    @Param('slug') slug: string,
    @CurrentSite() site: SiteContext,
  ) {
    return this.citiesService.findNeighborhoods(slug, site);
  }

  @Public()
  @Get(':slug')
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentSite() site: SiteContext,
  ) {
    return this.citiesService.findBySlug(slug, site);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post()
  async create(@Body() dto: CreateCityDto) {
    return this.citiesService.create(dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCityDto) {
    return this.citiesService.update(id, dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.citiesService.remove(id);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('image', IMAGE_UPLOAD_SINGLE),
    ValidateUploadInterceptor,
  )
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.citiesService.uploadImage(id, file);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/brands/:brand')
  async addBrand(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('brand') brand: Brand,
  ) {
    return this.citiesService.addBrand(id, brand);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id/brands/:brand')
  async removeBrand(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('brand') brand: Brand,
  ) {
    return this.citiesService.removeBrand(id, brand);
  }
}
