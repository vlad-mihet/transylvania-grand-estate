import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PropertyType, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { UpdatePropertyImageDto } from './dto/update-property-image.dto';

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  async findAll(query: QueryPropertyDto) {
    const {
      page = 1,
      limit = 12,
      city,
      type,
      status,
      minPrice,
      maxPrice,
      featured,
      developerId,
      isNew,
      sort,
      search,
    } = query;

    const where: Prisma.PropertyWhereInput = {};

    if (city) where.citySlug = city;
    if (type) where.type = type;
    if (status) where.status = status;
    if (featured !== undefined) where.featured = featured;
    if (isNew !== undefined) where.isNew = isNew;
    if (developerId) where.developerId = developerId;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = minPrice;
      if (maxPrice) where.price.lte = maxPrice;
    }
    if (search) {
      where.OR = [
        { title: { path: ['en'], string_contains: search } },
        { title: { path: ['ro'], string_contains: search } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.PropertyOrderByWithRelationInput = {};
    switch (sort) {
      case 'price_asc':
        orderBy.price = 'asc';
        break;
      case 'price_desc':
        orderBy.price = 'desc';
        break;
      case 'oldest':
        orderBy.createdAt = 'asc';
        break;
      case 'newest':
      default:
        orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          developer: true,
        },
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        developer: true,
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async findBySlug(slug: string) {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        developer: true,
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async create(dto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: {
        slug: dto.slug,
        title: dto.title as unknown as Prisma.InputJsonValue,
        description: dto.description as unknown as Prisma.InputJsonValue,
        shortDescription:
          dto.shortDescription as unknown as Prisma.InputJsonValue,
        price: dto.price,
        currency: dto.currency ?? 'EUR',
        type: dto.type,
        status: dto.status ?? PropertyStatus.available,
        city: dto.city,
        citySlug: dto.citySlug,
        neighborhood: dto.neighborhood,
        address: dto.address as unknown as Prisma.InputJsonValue,
        latitude: dto.coordinates.lat,
        longitude: dto.coordinates.lng,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        area: dto.area,
        landArea: dto.landArea,
        floors: dto.floors,
        yearBuilt: dto.yearBuilt,
        garage: dto.garage,
        pool: dto.pool,
        features: (dto.features ?? []) as unknown as Prisma.InputJsonValue,
        featured: dto.featured ?? false,
        isNew: dto.isNew ?? false,
        developerId: dto.developerId,
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        developer: true,
      },
    });
  }

  async update(id: string, dto: UpdatePropertyDto) {
    await this.ensureExists(id);

    const data: Prisma.PropertyUpdateInput = {};

    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.title !== undefined)
      data.title = dto.title as unknown as Prisma.InputJsonValue;
    if (dto.description !== undefined)
      data.description = dto.description as unknown as Prisma.InputJsonValue;
    if (dto.shortDescription !== undefined)
      data.shortDescription =
        dto.shortDescription as unknown as Prisma.InputJsonValue;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.citySlug !== undefined) data.citySlug = dto.citySlug;
    if (dto.neighborhood !== undefined) data.neighborhood = dto.neighborhood;
    if (dto.address !== undefined)
      data.address = dto.address as unknown as Prisma.InputJsonValue;
    if (dto.coordinates !== undefined) {
      data.latitude = dto.coordinates.lat;
      data.longitude = dto.coordinates.lng;
    }
    if (dto.bedrooms !== undefined) data.bedrooms = dto.bedrooms;
    if (dto.bathrooms !== undefined) data.bathrooms = dto.bathrooms;
    if (dto.area !== undefined) data.area = dto.area;
    if (dto.landArea !== undefined) data.landArea = dto.landArea;
    if (dto.floors !== undefined) data.floors = dto.floors;
    if (dto.yearBuilt !== undefined) data.yearBuilt = dto.yearBuilt;
    if (dto.garage !== undefined) data.garage = dto.garage;
    if (dto.pool !== undefined) data.pool = dto.pool;
    if (dto.features !== undefined)
      data.features = dto.features as unknown as Prisma.InputJsonValue;
    if (dto.featured !== undefined) data.featured = dto.featured;
    if (dto.isNew !== undefined) data.isNew = dto.isNew;
    if (dto.developerId !== undefined) {
      data.developer = dto.developerId
        ? { connect: { id: dto.developerId } }
        : { disconnect: true };
    }

    return this.prisma.property.update({
      where: { id },
      data,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        developer: true,
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.property.delete({ where: { id } });
  }

  // Image management
  async addImages(id: string, files: Express.Multer.File[]) {
    await this.ensureExists(id);

    const results = await this.uploadsService.uploadFiles(files, 'properties');
    const maxOrder = await this.prisma.propertyImage.aggregate({
      where: { propertyId: id },
      _max: { sortOrder: true },
    });
    const startOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const images = await Promise.all(
      results.map((result, index) =>
        this.prisma.propertyImage.create({
          data: {
            src: result.publicUrl,
            alt: { en: result.originalName, ro: result.originalName },
            sortOrder: startOrder + index,
            propertyId: id,
          },
        }),
      ),
    );

    return images;
  }

  async updateImage(
    propertyId: string,
    imageId: string,
    dto: UpdatePropertyImageDto,
  ) {
    await this.ensureExists(propertyId);

    const data: Prisma.PropertyImageUpdateInput = {};
    if (dto.alt !== undefined)
      data.alt = dto.alt as unknown as Prisma.InputJsonValue;
    if (dto.isHero !== undefined) data.isHero = dto.isHero;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    return this.prisma.propertyImage.update({
      where: { id: imageId },
      data,
    });
  }

  async removeImage(propertyId: string, imageId: string) {
    await this.ensureExists(propertyId);
    return this.prisma.propertyImage.delete({ where: { id: imageId } });
  }

  private async ensureExists(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }
}
