import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { CountiesService } from './counties.service';
import { CreateCountyDto } from './dto/create-county.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Counties')
@Controller('counties')
export class CountiesController {
  constructor(private countiesService: CountiesService) {}

  @Public()
  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('light') light?: boolean,
  ) {
    return this.countiesService.findAll({ search, sort, page, limit, light });
  }

  @Public()
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.countiesService.findBySlug(slug);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post()
  async create(@Body() dto: CreateCountyDto) {
    return this.countiesService.create(dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.countiesService.remove(id);
  }
}
