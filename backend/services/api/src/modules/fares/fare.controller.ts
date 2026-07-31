import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FareService } from './fare.service';
import { PassengerType, BusCategory } from '@buslanka/shared-types';

@ApiTags('Fares')
@Controller('fares')
export class FareController {
  constructor(private readonly fareService: FareService) {}

  @Get()
  @ApiOperation({ summary: 'Calculate fare for a specific journey leg' })
  calculate(
    @Query('routeId') routeId: string,
    @Query('fromStopId') fromStopId: string,
    @Query('toStopId') toStopId: string,
    @Query('passengerType') passengerType: PassengerType,
    @Query('busCategory') busCategory: BusCategory,
    @Query('travelDate') travelDate?: string,
  ) {
    return this.fareService.calculateFare({
      routeId,
      fromStopId,
      toStopId,
      passengerType,
      busCategory,
      travelDate: travelDate ? new Date(travelDate) : new Date(),
    });
  }
}
