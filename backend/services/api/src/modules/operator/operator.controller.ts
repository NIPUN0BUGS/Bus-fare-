import { Controller, Post, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { OperatorService } from './operator.service';

@ApiTags('Operator API')
@ApiSecurity('operator-api-key')
@Controller('operator')
export class OperatorController {
  constructor(private readonly operatorService: OperatorService) {}

  @Post('vehicles/:vehicleId/location')
  @ApiOperation({ summary: 'Submit real-time GPS location for a vehicle' })
  submitLocation(
    @Param('vehicleId') vehicleId: string,
    @Body() body: {
      tripId?: string; lat: number; lng: number;
      heading?: number; speedKmh?: number; occupancy?: string; timestamp: string;
    },
    @Headers('x-api-key') apiKey: string,
  ) {
    return this.operatorService.ingestGps(vehicleId, body, apiKey);
  }

  @Post('trips/:tripId/alerts')
  @ApiOperation({ summary: 'Submit a service alert for a trip' })
  submitAlert(
    @Param('tripId') tripId: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-api-key') apiKey: string,
  ) {
    return this.operatorService.submitAlert(tripId, body, apiKey);
  }

  @Post('fares')
  @ApiOperation({ summary: 'Submit fare table for a route' })
  submitFares(
    @Body() body: Record<string, unknown>,
    @Headers('x-api-key') apiKey: string,
  ) {
    return this.operatorService.submitFares(body, apiKey);
  }
}
