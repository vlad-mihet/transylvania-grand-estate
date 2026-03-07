import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';

@Injectable()
export class SiteConfigService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const config = await this.prisma.siteConfig.findUnique({
      where: { id: 'singleton' },
    });
    if (!config) throw new NotFoundException('Site config not found');
    return config;
  }

  async update(dto: UpdateSiteConfigDto) {
    const data: Prisma.SiteConfigUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.tagline !== undefined)
      data.tagline = dto.tagline as unknown as Prisma.InputJsonValue;
    if (dto.description !== undefined)
      data.description = dto.description as unknown as Prisma.InputJsonValue;
    if (dto.contact !== undefined)
      data.contact = dto.contact as unknown as Prisma.InputJsonValue;
    if (dto.socialLinks !== undefined)
      data.socialLinks = dto.socialLinks as unknown as Prisma.InputJsonValue;

    return this.prisma.siteConfig.update({
      where: { id: 'singleton' },
      data,
    });
  }
}
