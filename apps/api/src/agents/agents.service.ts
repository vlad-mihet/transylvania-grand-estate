import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  async findAll(query: { active?: boolean }) {
    const where: Prisma.AgentWhereInput = {};
    if (query.active !== undefined) where.active = query.active;

    return this.prisma.agent.findMany({
      where,
      include: { properties: { select: { id: true, slug: true, title: true } } },
      orderBy: { lastName: 'asc' },
    });
  }

  async findById(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        properties: { select: { id: true, slug: true, title: true } },
      },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async findBySlug(slug: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { slug },
      include: {
        properties: {
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async create(dto: CreateAgentDto) {
    return this.prisma.agent.create({
      data: {
        slug: dto.slug,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        photo: dto.photo,
        bio: dto.bio as unknown as Prisma.InputJsonValue,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateAgentDto) {
    await this.ensureExists(id);
    const data: Prisma.AgentUpdateInput = {};

    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.photo !== undefined) data.photo = dto.photo;
    if (dto.bio !== undefined)
      data.bio = dto.bio as unknown as Prisma.InputJsonValue;
    if (dto.active !== undefined) data.active = dto.active;

    return this.prisma.agent.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.agent.delete({ where: { id } });
  }

  async uploadPhoto(id: string, file: Express.Multer.File) {
    await this.ensureExists(id);
    const result = await this.uploadsService.uploadFile(file, 'agents');
    return this.prisma.agent.update({
      where: { id },
      data: { photo: result.publicUrl },
    });
  }

  private async ensureExists(id: string) {
    const agent = await this.prisma.agent.findUnique({ where: { id } });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }
}
