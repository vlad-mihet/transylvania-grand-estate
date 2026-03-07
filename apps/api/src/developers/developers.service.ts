import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { UpdateDeveloperDto } from './dto/update-developer.dto';

@Injectable()
export class DevelopersService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  async findAll(query: { featured?: boolean; city?: string }) {
    const where: Prisma.DeveloperWhereInput = {};
    if (query.featured !== undefined) where.featured = query.featured;
    if (query.city) where.citySlug = query.city;

    return this.prisma.developer.findMany({
      where,
      include: { properties: { select: { id: true, slug: true, title: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const developer = await this.prisma.developer.findUnique({
      where: { id },
      include: {
        properties: { select: { id: true, slug: true, title: true } },
      },
    });
    if (!developer) throw new NotFoundException('Developer not found');
    return developer;
  }

  async findBySlug(slug: string) {
    const developer = await this.prisma.developer.findUnique({
      where: { slug },
      include: {
        properties: {
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!developer) throw new NotFoundException('Developer not found');
    return developer;
  }

  async create(dto: CreateDeveloperDto) {
    return this.prisma.developer.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        logo: dto.logo ?? '/uploads/placeholder-logo.png',
        description: dto.description as unknown as Prisma.InputJsonValue,
        shortDescription: dto.shortDescription as unknown as Prisma.InputJsonValue,
        city: dto.city,
        citySlug: dto.citySlug,
        website: dto.website,
        projectCount: dto.projectCount ?? 0,
        featured: dto.featured ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateDeveloperDto) {
    await this.ensureExists(id);
    const data: Prisma.DeveloperUpdateInput = {};

    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.logo !== undefined) data.logo = dto.logo;
    if (dto.description !== undefined)
      data.description = dto.description as unknown as Prisma.InputJsonValue;
    if (dto.shortDescription !== undefined)
      data.shortDescription = dto.shortDescription as unknown as Prisma.InputJsonValue;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.citySlug !== undefined) data.citySlug = dto.citySlug;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.projectCount !== undefined) data.projectCount = dto.projectCount;
    if (dto.featured !== undefined) data.featured = dto.featured;

    return this.prisma.developer.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.developer.delete({ where: { id } });
  }

  async uploadLogo(id: string, file: Express.Multer.File) {
    await this.ensureExists(id);
    const result = await this.uploadsService.uploadFile(file, 'developers');
    return this.prisma.developer.update({
      where: { id },
      data: { logo: result.publicUrl },
    });
  }

  private async ensureExists(id: string) {
    const developer = await this.prisma.developer.findUnique({ where: { id } });
    if (!developer) throw new NotFoundException('Developer not found');
    return developer;
  }
}
