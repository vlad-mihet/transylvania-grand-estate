import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { QueryInquiryDto } from './dto/query-inquiry.dto';
import { UpdateInquiryStatusDto } from './dto/update-inquiry-status.dto';
import { paginate } from '../common/utils/pagination.util';
import { ensureFound } from '../common/utils/ensure-found.util';
import { ensureRef } from '../common/utils/ensure-ref.util';

@Injectable()
export class InquiriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInquiryDto) {
    await ensureRef(dto.propertySlug, 'propertySlug', (slug) =>
      this.prisma.property.findUnique({
        where: { slug },
        select: { id: true },
      }),
    );

    return this.prisma.inquiry.create({
      data: {
        type: dto.type ?? 'general',
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
        entityName: dto.entityName,
        entitySlug: dto.entitySlug,
        budget: dto.budget,
        propertySlug: dto.propertySlug,
        source: dto.source,
        sourceUrl: dto.sourceUrl,
      },
    });
  }

  async findAll(query: QueryInquiryDto) {
    const { page = 1, limit = 12, type, status } = query;
    const where: Prisma.InquiryWhereInput = {};
    if (type) where.type = type;
    if (status) where.status = status;

    return paginate(
      (skip, take) =>
        this.prisma.inquiry.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
      () => this.prisma.inquiry.count({ where }),
      page,
      limit,
    );
  }

  async findById(id: string) {
    return ensureFound(
      this.prisma.inquiry.findUnique({ where: { id } }),
      'Inquiry',
    );
  }

  async updateStatus(id: string, dto: UpdateInquiryStatusDto) {
    await this.ensureExists(id);
    return this.prisma.inquiry.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.inquiry.delete({ where: { id } });
  }

  private ensureExists(id: string) {
    return ensureFound(
      this.prisma.inquiry.findUnique({ where: { id } }),
      'Inquiry',
    );
  }
}
