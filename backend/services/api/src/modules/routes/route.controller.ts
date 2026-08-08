import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RouteService } from './route.service';

@ApiTags('Routes')
@Controller('routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get()
  @ApiOperation({ summary: 'List active routes' })
  findAll(@Query('operatorId') operatorId?: string) {
    return this.routeService.findAll(operatorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route details' })
  findOne(@Param('id') id: string) {
    return this.routeService.findOne(id);
  }

  @Get(':id/stops')
  @ApiOperation({ summary: 'Get ordered stop list for a route' })
  getRouteStops(@Param('id') id: string) {
    return this.routeService.getRouteStops(id);
  }
}
