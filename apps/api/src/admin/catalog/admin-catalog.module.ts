import { Module } from '@nestjs/common';
import { AdminCatalogController } from './admin-catalog.controller';
import { AdminCatalogService } from './admin-catalog.service';

/**
 * Aggregator surface for the admin Catalog module home (`/catalog`).
 * Reads only — no writes here, no DTOs. PrismaService comes from the
 * global PrismaModule.
 */
@Module({
  controllers: [AdminCatalogController],
  providers: [AdminCatalogService],
})
export class AdminCatalogModule {}
