import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteStatus } from '@buslanka/shared-types';
import { RouteEntity } from './entities/route.entity';
import { BusStopEntity } from './entities/bus-stop.entity';

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(RouteEntity)
    private routeRepo: Repository<RouteEntity>,
    @InjectRepository(BusStopEntity)
    private stopRepo: Repository<BusStopEntity>,
  ) {}

  async findAll(operatorId?: string) {
    const qb = this.routeRepo
      .createQueryBuilder('route')
      .where('route.status = :status', { status: RouteStatus.ACTIVE })
      .andWhere('route.deleted_at IS NULL');

    if (operatorId) {
      qb.andWhere('route.operator_id = :operatorId', { operatorId });
    }

    return qb.getMany();
  }

  async findOne(id: string) {
    const route = await this.routeRepo.findOne({
      where: { id, status: RouteStatus.ACTIVE },
    });
    if (!route) throw new NotFoundException(`Route ${id} not found.`);
    return route;
  }

  async getRouteStops(routeId: string) {
    const rows = await this.stopRepo.query(
      `SELECT bs.id, bs.stop_code, bs.name, bs.name_si, bs.name_ta, bs.lat, bs.lng,
              rs.sequence, rs.fare_stage_number, rs.direction
       FROM route_stops rs
       JOIN bus_stops bs ON bs.id = rs.stop_id
       WHERE rs.route_id = $1
         AND bs.deleted_at IS NULL
         AND bs.status = 'ACTIVE'
       ORDER BY rs.direction, rs.sequence`,
      [routeId],
    ) as Array<{
      id: string; stop_code: string | null; name: string; name_si: string | null; name_ta: string | null;
      lat: number; lng: number; sequence: number; fare_stage_number: number | null; direction: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      stopCode: r.stop_code,
      name: r.name,
      nameSi: r.name_si,
      nameTa: r.name_ta,
      lat: r.lat,
      lng: r.lng,
      sequence: r.sequence,
      fareStageNumber: r.fare_stage_number,
      direction: r.direction,
    }));
  }

  async findNearbyStops(lat: number, lng: number, radiusMeters: number, page: number, perPage: number) {
    const offset = (page - 1) * perPage;
    const rows = await this.stopRepo.query(
      `SELECT id, stop_code, name, name_si, name_ta, lat, lng, is_terminus, has_shelter, wheelchair_accessible, status,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) AS distance_meters
       FROM bus_stops
       WHERE ST_DWithin(
         ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
         $3
       )
       AND deleted_at IS NULL
       AND status = 'ACTIVE'
       ORDER BY distance_meters ASC
       LIMIT $4 OFFSET $5`,
      [lat, lng, radiusMeters, perPage, offset],
    ) as Array<{ id: string; stop_code: string | null; name: string; name_si: string | null; name_ta: string | null; lat: number; lng: number; is_terminus: boolean; has_shelter: boolean; wheelchair_accessible: boolean; status: string; distance_meters: number }>;

    return rows.map((r) => ({
      id: r.id,
      stopCode: r.stop_code,
      name: r.name,
      nameSi: r.name_si,
      nameTa: r.name_ta,
      lat: r.lat,
      lng: r.lng,
      isTerminus: r.is_terminus,
      hasShelter: r.has_shelter,
      wheelchairAccessible: r.wheelchair_accessible,
      status: r.status,
      distanceMeters: parseFloat(r.distance_meters as unknown as string),
    }));
  }
}
