import { Controller, Get, Post, Param, Body, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly trackingGateway: TrackingGateway,
  ) {}

  @Get('routes/:routeId/vehicles')
  @ApiOperation({ summary: 'Get current positions of all vehicles on a route' })
  getVehiclesOnRoute(@Param('routeId') routeId: string) {
    return this.trackingService.getVehiclesOnRoute(routeId);
  }

  @Get('vehicles')
  @ApiOperation({ summary: 'Get all live vehicle positions' })
  getAllVehicles() {
    return this.trackingService.getAllVehicles();
  }

  @Post('simulate')
  @ApiOperation({ summary: '[DEV] Simulate a vehicle GPS update — not available in production' })
  simulate(
    @Body() body: {
      vehicleId: string;
      routeId?: string;
      lat: number;
      lng: number;
      heading?: number;
      speedKmh?: number;
      occupancy?: string;
    },
  ) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new ForbiddenException('Simulation endpoint is not available in production.');
    }

    const updatedAt = new Date();

    this.trackingService.updateVehicleLocation(body.vehicleId, body.routeId ?? null, {
      lat: body.lat,
      lng: body.lng,
      heading: body.heading ?? null,
      speedKmh: body.speedKmh ?? null,
      occupancy: body.occupancy ?? null,
      updatedAt,
    });

    this.trackingGateway.broadcastVehiclePosition(body.routeId ?? null, {
      vehicleId: body.vehicleId,
      routeId: body.routeId ?? null,
      lat: body.lat,
      lng: body.lng,
      heading: body.heading ?? null,
      speedKmh: body.speedKmh ?? null,
      occupancy: body.occupancy ?? null,
      updatedAt: updatedAt.toISOString(),
    });

    return { simulated: true, vehicleId: body.vehicleId, at: updatedAt.toISOString() };
  }
}
