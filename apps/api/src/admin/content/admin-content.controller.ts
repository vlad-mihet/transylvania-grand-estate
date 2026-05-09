import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminContentService } from './admin-content.service';

@ApiTags('AdminContent')
@Controller('admin/content')
@Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
export class AdminContentController {
  constructor(private service: AdminContentService) {}

  @Get('locale-completeness')
  async localeCompleteness() {
    return this.service.localeCompleteness();
  }
}
