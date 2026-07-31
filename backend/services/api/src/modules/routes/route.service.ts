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

  async findNearbyStops(lat: number, lng: number, radiusMeters: number, page: number, perPage: number) {
    // PostGIS query — raw SQL since TypeORM doesn't wrap PostGIS functions
    const offset = (page - 1) * perPage;
    return this.stopRepo.query(
      `SELECT *,
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
    );
  }
}
