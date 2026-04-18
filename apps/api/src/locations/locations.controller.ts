import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Public()
  @Get('search')
  async search(@Query('q') q: string) {
    return this.locationsService.search(q);
  }
}
