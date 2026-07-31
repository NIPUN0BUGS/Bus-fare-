import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('routes/:routeId/vehicles')
  @ApiOperation({ summary: 'Get current positions of all vehicles on a route' })
  getVehiclesOnRoute(@Param('routeId') routeId: string) {
    return this.trackingService.getVehiclesOnRoute(routeId);
  }
}
