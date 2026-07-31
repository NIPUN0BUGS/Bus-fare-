import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { OccupancyLevel } from '@buslanka/shared-types';
import { TrackingGateway } from '../../tracking/tracking.gateway';
import { OperatorEntity } from '../entities/operator.entity';

interface GpsJob {
  vehicleId: string;
  operatorId: string;
  tripId?: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKmh?: number;
  occupancy?: string;
  timestamp: string;
}

const VALID_OCCUPANCY = new Set<string>(Object.values(OccupancyLevel));

@Processor('gps.ingest')
export class GpsIngestProcessor {
  private readonly logger = new Logger(GpsIngestProcessor.name);

  constructor(
    private readonly trackingGateway: TrackingGateway,
    @InjectRepository(OperatorEntity)
    private readonly operatorRepo: Repository<OperatorEntity>,
  ) {}

  @Process('ingest')
  async handleIngest(job: Job<GpsJob>) {
    const {
      vehicleId,
      operatorId,
      tripId,
      lat,
      lng,
      heading,
      speedKmh,
      occupancy,
      timestamp,
    } = job.data;

    // Resolve which route(s) this vehicle is currently serving so we can
    // broadcast to the correct Socket.IO rooms.
    const routeIds = await this.resolveRouteIds(vehicleId, operatorId, tripId);

    if (routeIds.length === 0) {
      this.logger.debug(`No active route found for vehicle ${vehicleId} — position buffered but not broadcast`);
      return;
    }

    const normalizedOccupancy = occupancy && VALID_OCCUPANCY.has(occupancy)
      ? (occupancy as OccupancyLevel)
      : undefined;

    const position = {
      vehicleId,
      tripId,
      lat,
      lng,
      heading: heading ?? null,
      speedKmh: speedKmh ?? null,
      occupancy: normalizedOccupancy ?? null,
      receivedAt: timestamp,
      broadcastAt: new Date().toISOString(),
    };

    for (const routeId of routeIds) {
      this.trackingGateway.broadcastVehiclePosition(routeId, position);
    }

    this.logger.debug(
      `Vehicle ${vehicleId} position broadcast to ${routeIds.length} route room(s) at (${lat}, ${lng})`,
    );
  }

  /**
   * In Phase 2, this will query the `trips` and `vehicle_assignments` tables
   * to find active trips for this vehicle. For now it returns an empty array
   * so the system is safe but silent until trip management is implemented.
   */
  private async resolveRouteIds(
    vehicleId: string,
    operatorId: string,
    tripId?: string,
  ): Promise<string[]> {
    void vehicleId;
    void operatorId;
    void tripId;
    return [];
  }
}
