import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankRateDto } from './dto/create-bank-rate.dto';
import { UpdateBankRateDto } from './dto/update-bank-rate.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';

@Injectable()
export class FinancialDataService {
  constructor(private prisma: PrismaService) {}

  // ─── Bank Rates ──────────────────────────────────────────

  async findAllBankRates(activeOnly = true) {
    const where: Prisma.BankRateWhereInput = {};
    if (activeOnly) where.active = true;

    return this.prisma.bankRate.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findBankRateById(id: string) {
    const rate = await this.prisma.bankRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Bank rate not found');
    return rate;
  }

  async createBankRate(dto: CreateBankRateDto) {
    return this.prisma.bankRate.create({
      data: {
        bankName: dto.bankName,
        rate: dto.rate,
        rateType: dto.rateType,
        maxLtv: dto.maxLtv ?? null,
        maxTermYears: dto.maxTermYears ?? null,
        processingFee: dto.processingFee ?? null,
        insuranceRate: dto.insuranceRate ?? null,
        notes: dto.notes ?? null,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateBankRate(id: string, dto: UpdateBankRateDto) {
    await this.ensureBankRateExists(id);
    const data: Prisma.BankRateUpdateInput = {};

    if (dto.bankName !== undefined) data.bankName = dto.bankName;
    if (dto.rate !== undefined) data.rate = dto.rate;
    if (dto.rateType !== undefined) data.rateType = dto.rateType;
    if (dto.maxLtv !== undefined) data.maxLtv = dto.maxLtv;
    if (dto.maxTermYears !== undefined) data.maxTermYears = dto.maxTermYears;
    if (dto.processingFee !== undefined) data.processingFee = dto.processingFee;
    if (dto.insuranceRate !== undefined) data.insuranceRate = dto.insuranceRate;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    return this.prisma.bankRate.update({ where: { id }, data });
  }

  async removeBankRate(id: string) {
    await this.ensureBankRateExists(id);
    return this.prisma.bankRate.delete({ where: { id } });
  }

  private async ensureBankRateExists(id: string) {
    const rate = await this.prisma.bankRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Bank rate not found');
    return rate;
  }

  // ─── Financial Indicators ────────────────────────────────

  async findAllIndicators() {
    return this.prisma.financialIndicator.findMany();
  }

  async findIndicatorByKey(key: string) {
    const indicator = await this.prisma.financialIndicator.findUnique({
      where: { key },
    });
    if (!indicator)
      throw new NotFoundException(`Indicator "${key}" not found`);
    return indicator;
  }

  async updateIndicator(key: string, dto: UpdateIndicatorDto) {
    await this.findIndicatorByKey(key);

    return this.prisma.financialIndicator.update({
      where: { key },
      data: {
        value: dto.value,
        source: dto.source ?? 'Admin',
        sourceUrl: dto.sourceUrl ?? null,
        fetchedAt: new Date(),
      },
    });
  }

  async upsertIndicator(
    key: string,
    value: number,
    source: string,
    sourceUrl?: string,
  ) {
    return this.prisma.financialIndicator.upsert({
      where: { key },
      update: {
        value,
        source,
        sourceUrl: sourceUrl ?? null,
        fetchedAt: new Date(),
      },
      create: {
        key,
        value,
        source,
        sourceUrl: sourceUrl ?? null,
        fetchedAt: new Date(),
      },
    });
  }

  // ─── Combined Config (one call for frontend) ────────────

  async getCalculatorConfig() {
    const [bankRates, indicators] = await Promise.all([
      this.findAllBankRates(true),
      this.findAllIndicators(),
    ]);

    const indicatorMap: Record<string, { value: number; fetchedAt: Date }> = {};
    for (const ind of indicators) {
      indicatorMap[ind.key] = { value: ind.value, fetchedAt: ind.fetchedAt };
    }

    return {
      bankRates,
      indicators: indicatorMap,
    };
  }
}
