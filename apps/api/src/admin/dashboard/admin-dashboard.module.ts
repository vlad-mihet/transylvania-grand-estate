import { Module } from '@nestjs/common';
import { AdminContentModule } from '../content/admin-content.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

/**
 * Aggregator surface for the admin Dashboard's "Today" page. Reads only —
 * no writes here, no DTOs. Imports AdminContentModule for its already-tested
 * locale-completeness logic; PrismaService and AuditHealthService come from
 * the global PrismaModule + AuditModule.
 */
@Module({
  imports: [AdminContentModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
