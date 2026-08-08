import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PassengerType, BusCategory } from '@buslanka/shared-types';
import { BusStopEntity } from '../routes/entities/bus-stop.entity';
import { RouteService } from '../routes/route.service';
import { FareService } from '../fares/fare.service';

interface JourneySearchInput {
  fromText?: string;
  toText?: string;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  departureDate?: string;
  passengerType?: PassengerType;
  maxTransfers?: number;
  sortBy?: 'DEPARTURE' | 'FARE' | 'DURATION' | 'TRANSFERS';
  busCategory?: BusCategory;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(BusStopEntity)
    private stopRepo: Repository<BusStopEntity>,
    private routeService: RouteService,
    private fareService: FareService,
  ) {}

  async searchJourney(input: JourneySearchInput) {
    const hasOrigin = (input.fromLat && input.fromLng) || input.fromText;
    const hasDest = (input.toLat && input.toLng) || input.toText;

    if (!hasOrigin) throw new BadRequestException('Origin is required (fromText or fromLat/fromLng).');
    if (!hasDest) throw new BadRequestException('Destination is required (toText or toLat/toLng).');

    const fromStop = await this.resolveStop(input.fromText, input.fromLat, input.fromLng);
    const toStop = await this.resolveStop(input.toText, input.toLat, input.toLng);

    if (!fromStop) {
      return { error: 'ORIGIN_NOT_FOUND', journeys: [], resolvedFrom: null, resolvedTo: null };
    }
    if (!toStop) {
      return { error: 'DESTINATION_NOT_FOUND', journeys: [], resolvedFrom: null, resolvedTo: null };
    }

    // Journey graph traversal: find routes that serve both stops
    const routes = await this.stopRepo.query(
      `SELECT DISTINCT r.id, r.route_number, r.name, r.bus_category, r.operator_id,
              rs_from.sequence AS seq_from, rs_to.sequence AS seq_to,
              rs_from.fare_stage_number AS stage_from, rs_to.fare_stage_number AS stage_to
       FROM routes r
       JOIN route_stops rs_from ON rs_from.route_id = r.id AND rs_from.stop_id = $1
       JOIN route_stops rs_to   ON rs_to.route_id   = r.id AND rs_to.stop_id   = $2
                                AND rs_to.direction = rs_from.direction
                                AND rs_to.sequence > rs_from.sequence
       WHERE r.status = 'ACTIVE' AND r.deleted_at IS NULL
       ${input.busCategory ? `AND r.bus_category = '${input.busCategory}'` : ''}
       LIMIT 20`,
      [fromStop.id, toStop.id],
    );

    const travelDate = input.departureDate ? new Date(input.departureDate) : new Date();
    const passengerType = input.passengerType ?? PassengerType.ADULT;

    const journeys = await Promise.all(
      (routes as Array<{
        id: string; route_number: string; name: string;
        bus_category: BusCategory; operator_id: string;
        stage_from: number; stage_to: number;
      }>).map(async (r) => {
        const fare = await this.fareService.calculateFare({
          routeId: r.id,
          fromStopId: fromStop.id,
          toStopId: toStop.id,
          passengerType,
          busCategory: r.bus_category,
          travelDate,
        });

        return {
          id: `journey-${r.id}-${fromStop.id}-${toStop.id}`,
          totalFare: {
            amount: fare.amount,
            currency: 'LKR',
            status: fare.status,
            source: fare.sourceName,
            effectiveFrom: fare.effectiveFrom?.toISOString() ?? null,
            updatedAt: fare.updatedAt?.toISOString() ?? null,
          },
          totalDurationMinutes: 0,
          transfers: 0,
          legs: [{
            legIndex: 1,
            routeNumber: r.route_number,
            routeName: r.name,
            operator: { id: r.operator_id, name: '' },
            busCategory: r.bus_category,
            fromStop: { id: fromStop.id, name: fromStop.name, nameSi: fromStop.nameSi, nameTa: fromStop.nameTa, lat: fromStop.lat, lng: fromStop.lng, code: fromStop.stopCode },
            toStop: { id: toStop.id, name: toStop.name, nameSi: toStop.nameSi, nameTa: toStop.nameTa, lat: toStop.lat, lng: toStop.lng, code: toStop.stopCode },
            scheduledDeparture: null,
            scheduledArrival: null,
            durationMinutes: 0,
            fare,
            liveTracking: { available: false, vehicleId: null, vehicleReg: null, lastUpdateAt: null, nextStop: null, etaMinutes: null, occupancy: null },
            ticketBooking: { available: false, reason: 'ORDINARY_STANDING_ONLY' },
            accessibility: { wheelchairAccessible: fromStop.wheelchairAccessible },
          }],
        };
      }),
    );

    return {
      journeys,
      resolvedFrom: { text: fromStop.name, lat: fromStop.lat, lng: fromStop.lng, type: 'BUS_STOP' },
      resolvedTo: { text: toStop.name, lat: toStop.lat, lng: toStop.lng, type: 'BUS_STOP' },
    };
  }

  async nearbyStops(lat: number, lng: number, radiusMeters: number, page: number, perPage: number) {
    return this.routeService.findNearbyStops(lat, lng, radiusMeters, page, perPage);
  }

  async autocomplete(q: string, locale: string, lat?: number, lng?: number) {
    if (q.length < 2) return { suggestions: [] };

    const results = await this.stopRepo.query(
      `SELECT id, stop_code, name, name_si, name_ta, lat, lng
       FROM bus_stops
       WHERE to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(name_si,'') || ' ' || coalesce(name_ta,''))
             @@ plainto_tsquery('simple', $1)
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       ORDER BY ${lat && lng ? `ST_Distance(ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography) ASC,` : ''} name ASC
       LIMIT 8`,
      lat && lng ? [q, lat, lng] : [q],
    );

    return {
      suggestions: (results as BusStopEntity[]).map((s) => ({
        id: s.id,
        type: 'BUS_STOP',
        label: s.name,
        labelSi: s.nameSi,
        labelTa: s.nameTa,
        lat: s.lat,
        lng: s.lng,
      })),
    };
  }

  private async resolveStop(text?: string, lat?: number, lng?: number) {
    if (lat !== undefined && lng !== undefined) {
      const results = await this.routeService.findNearbyStops(lat, lng, 300, 1, 1);
      return (results[0] as BusStopEntity | undefined) ?? null;
    }
    if (text) {
      return this.stopRepo
        .createQueryBuilder('s')
        .where(`to_tsvector('simple', coalesce(s.name,'') || ' ' || coalesce(s.name_si,'') || ' ' || coalesce(s.name_ta,'')) @@ plainto_tsquery('simple', :q)`, { q: text })
        .andWhere(`s.status = 'ACTIVE'`)
        .andWhere('s.deleted_at IS NULL')
        .getOne();
    }
    return null;
  }
}
