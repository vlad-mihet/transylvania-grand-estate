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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { TestimonialsService } from './testimonials.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Testimonials')
@Controller('testimonials')
export class TestimonialsController {
  constructor(private testimonialsService: TestimonialsService) {}

  @Public()
  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.testimonialsService.findAll({ page, limit });
  }

  @Public()
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.testimonialsService.findById(id);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post()
  async create(@Body() dto: CreateTestimonialDto) {
    return this.testimonialsService.create(dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestimonialDto) {
    return this.testimonialsService.update(id, dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.testimonialsService.remove(id);
  }
}
