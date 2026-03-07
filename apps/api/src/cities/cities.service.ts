import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class CitiesService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  async findAll() {
    return this.prisma.city.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  async findBySlug(slug: string) {
    const city = await this.prisma.city.findUnique({ where: { slug } });
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  async create(dto: CreateCityDto) {
    return this.prisma.city.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description as unknown as Prisma.InputJsonValue,
        image: dto.image ?? '/uploads/placeholder-city.png',
        propertyCount: dto.propertyCount ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateCityDto) {
    await this.ensureExists(id);
    const data: Prisma.CityUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined)
      data.description = dto.description as unknown as Prisma.InputJsonValue;
    if (dto.image !== undefined) data.image = dto.image;
    if (dto.propertyCount !== undefined) data.propertyCount = dto.propertyCount;

    return this.prisma.city.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.city.delete({ where: { id } });
  }

  async uploadImage(id: string, file: Express.Multer.File) {
    await this.ensureExists(id);
    const result = await this.uploadsService.uploadFile(file, 'cities');
    return this.prisma.city.update({
      where: { id },
      data: { image: result.publicUrl },
    });
  }

  private async ensureExists(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('City not found');
    return city;
  }
}
