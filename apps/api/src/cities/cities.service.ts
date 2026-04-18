import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { ensureFound } from '../common/utils/ensure-found.util';
import { ensureSlugUnique } from '../common/utils/ensure-slug-unique.util';
import { toJson } from '../common/utils/prisma-json';

@Injectable()
export class CitiesService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  async findAll(countySlug?: string) {
    const where = countySlug ? { county: { slug: countySlug } } : {};
    return this.prisma.city.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { county: true },
    });
  }

  async findById(id: string) {
    return ensureFound(
      this.prisma.city.findUnique({
        where: { id },
        include: { county: true },
      }),
      'City',
    );
  }

  async findBySlug(slug: string) {
    return ensureFound(
      this.prisma.city.findUnique({
        where: { slug },
        include: { county: true },
      }),
      'City',
    );
  }

  async findNeighborhoods(citySlug: string) {
    const city = await ensureFound(
      this.prisma.city.findUnique({ where: { slug: citySlug } }),
      'City',
    );
    return this.prisma.neighborhood.findMany({
      where: { cityId: city.id },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateCityDto) {
    await ensureSlugUnique(dto.slug, 'City', (slug) =>
      this.prisma.city.findUnique({
        where: { slug },
        select: { id: true },
      }),
    );
    const county = await ensureFound(
      this.prisma.county.findUnique({ where: { slug: dto.countySlug } }),
      'County',
    );
    return this.prisma.city.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: toJson(dto.description),
        image: dto.image ?? '/uploads/placeholder-city.png',
        propertyCount: dto.propertyCount ?? 0,
        county: { connect: { id: county.id } },
      },
    });
  }

  async update(id: string, dto: UpdateCityDto) {
    await this.ensureExists(id);
    const data: Prisma.CityUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined)
      data.description = toJson(dto.description);
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

  private ensureExists(id: string) {
    return ensureFound(
      this.prisma.city.findUnique({ where: { id } }),
      'City',
    );
  }
}
