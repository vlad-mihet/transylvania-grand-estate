import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

@Injectable()
export class TestimonialsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.testimonial.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const testimonial = await this.prisma.testimonial.findUnique({
      where: { id },
    });
    if (!testimonial) throw new NotFoundException('Testimonial not found');
    return testimonial;
  }

  async create(dto: CreateTestimonialDto) {
    return this.prisma.testimonial.create({
      data: {
        clientName: dto.clientName,
        location: dto.location,
        propertyType: dto.propertyType,
        quote: dto.quote as unknown as Prisma.InputJsonValue,
        rating: dto.rating,
      },
    });
  }

  async update(id: string, dto: UpdateTestimonialDto) {
    await this.ensureExists(id);
    const data: Prisma.TestimonialUpdateInput = {};

    if (dto.clientName !== undefined) data.clientName = dto.clientName;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.propertyType !== undefined) data.propertyType = dto.propertyType;
    if (dto.quote !== undefined)
      data.quote = dto.quote as unknown as Prisma.InputJsonValue;
    if (dto.rating !== undefined) data.rating = dto.rating;

    return this.prisma.testimonial.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.testimonial.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    const testimonial = await this.prisma.testimonial.findUnique({
      where: { id },
    });
    if (!testimonial) throw new NotFoundException('Testimonial not found');
    return testimonial;
  }
}
