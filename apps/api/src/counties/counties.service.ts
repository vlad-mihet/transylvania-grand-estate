import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCountyDto } from './dto/create-county.dto';

@Injectable()
export class CountiesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.county.findMany({
      orderBy: { name: 'asc' },
      include: { cities: { orderBy: { name: 'asc' } } },
    });
  }

  async findBySlug(slug: string) {
    const county = await this.prisma.county.findUnique({
      where: { slug },
      include: { cities: { orderBy: { name: 'asc' } } },
    });
    if (!county) throw new NotFoundException('County not found');
    return county;
  }

  async create(dto: CreateCountyDto) {
    return this.prisma.county.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        code: dto.code,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async remove(id: string) {
    const county = await this.prisma.county.findUnique({ where: { id } });
    if (!county) throw new NotFoundException('County not found');
    return this.prisma.county.delete({ where: { id } });
  }
}
