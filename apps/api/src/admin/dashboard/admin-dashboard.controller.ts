import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../common/decorators/user.decorator';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('AdminDashboard')
@Controller('admin/dashboard')
@Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
export class AdminDashboardController {
  constructor(private service: AdminDashboardService) {}

  @Get('attention')
  async attention(@CurrentUser() user: CurrentUserPayload) {
    // RolesGuard enforces a non-AGENT admin role above; `user` is non-null.
    return this.service.getAttention(user.role);
  }
}
