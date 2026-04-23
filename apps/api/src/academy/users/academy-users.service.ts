import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFound } from '../../common/utils/ensure-found.util';
import { paginate } from '../../common/utils/pagination.util';
import type {
  ListAcademyUsersDto,
  UpdateAcademyUserDto,
} from './dto/academy-users.dto';

@Injectable()
export class AcademyUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAcademyUsersDto) {
    const { page = 1, limit = 20, search, enrolled, sort } = query;
    const where: Prisma.AcademyUserWhereInput = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (enrolled === true) {
      where.enrollments = { some: { revokedAt: null } };
    } else if (enrolled === false) {
      where.enrollments = { none: { revokedAt: null } };
    }
    const orderBy: Prisma.AcademyUserOrderByWithRelationInput =
      sort === 'oldest'
        ? { createdAt: 'asc' }
        : sort === 'lastLogin'
          ? { lastLoginAt: { sort: 'desc', nulls: 'last' } }
          : { createdAt: 'desc' };

    return paginate(
      (skip, take) =>
        this.prisma.academyUser.findMany({
          where,
          orderBy,
          skip,
          take,
          select: {
            id: true,
            email: true,
            name: true,
            locale: true,
            lastLoginAt: true,
            createdAt: true,
            _count: { select: { enrollments: { where: { revokedAt: null } } } },
          },
        }),
      () => this.prisma.academyUser.count({ where }),
      page,
      limit,
    );
  }

  async findById(id: string) {
    return ensureFound(
      this.prisma.academyUser.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          locale: true,
          lastLoginAt: true,
          createdAt: true,
          enrollments: {
            where: { revokedAt: null },
            include: { course: { select: { id: true, slug: true, title: true } } },
          },
          identities: {
            select: { id: true, provider: true, email: true, emailVerified: true },
          },
        },
      }),
      'Academy user',
    );
  }

  async update(id: string, dto: UpdateAcademyUserDto) {
    await ensureFound(
      this.prisma.academyUser.findUnique({
        where: { id },
        select: { id: true },
      }),
      'Academy user',
    );
    const data: Prisma.AcademyUserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.locale !== undefined) data.locale = dto.locale;
    return this.prisma.academyUser.update({ where: { id }, data });
  }

  async remove(id: string) {
    await ensureFound(
      this.prisma.academyUser.findUnique({
        where: { id },
        select: { id: true },
      }),
      'Academy user',
    );
    // Cascade handles identities, enrollments, reset tokens.
    return this.prisma.academyUser.delete({ where: { id } });
  }
}
