import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { PassengerType, BusCategory } from '@buslanka/shared-types';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('journey')
  @ApiOperation({ summary: 'Search for bus journeys between two points' })
  @ApiQuery({ name: 'fromText', required: false })
  @ApiQuery({ name: 'toText', required: false })
  @ApiQuery({ name: 'fromLat', required: false, type: Number })
  @ApiQuery({ name: 'fromLng', required: false, type: Number })
  @ApiQuery({ name: 'toLat', required: false, type: Number })
  @ApiQuery({ name: 'toLng', required: false, type: Number })
  @ApiQuery({ name: 'departureDate', required: false })
  @ApiQuery({ name: 'passengerType', required: false, enum: PassengerType })
  @ApiQuery({ name: 'maxTransfers', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['DEPARTURE', 'FARE', 'DURATION', 'TRANSFERS'] })
  @ApiQuery({ name: 'busCategory', required: false, enum: BusCategory })
  searchJourney(
    @Query('fromText') fromText?: string,
    @Query('toText') toText?: string,
    @Query('fromLat') fromLat?: number,
    @Query('fromLng') fromLng?: number,
    @Query('toLat') toLat?: number,
    @Query('toLng') toLng?: number,
    @Query('departureDate') departureDate?: string,
    @Query('passengerType') passengerType?: PassengerType,
    @Query('maxTransfers') maxTransfers?: number,
    @Query('sortBy') sortBy?: string,
    @Query('busCategory') busCategory?: BusCategory,
  ) {
    return this.searchService.searchJourney({
      fromText, toText, fromLat, fromLng, toLat, toLng,
      departureDate, passengerType, maxTransfers,
      sortBy: sortBy as 'DEPARTURE' | 'FARE' | 'DURATION' | 'TRANSFERS',
      busCategory,
    });
  }

  @Get('stops/nearby')
  @ApiOperation({ summary: 'Find bus stops near a coordinate' })
  nearbyStops(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radiusMeters') radiusMeters = 500,
    @Query('page') page = 1,
    @Query('perPage') perPage = 20,
  ) {
    return this.searchService.nearbyStops(lat, lng, radiusMeters, page, perPage);
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete for stop names and places' })
  autocomplete(
    @Query('q') q: string,
    @Query('locale') locale = 'en',
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
  ) {
    return this.searchService.autocomplete(q, locale, lat, lng);
  }
}
