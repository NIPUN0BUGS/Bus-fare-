import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { OccupancyLevel } from '@buslanka/shared-types';
import { TrackingGateway } from '../../tracking/tracking.gateway';
import { TrackingService } from '../../tracking/tracking.service';
import { OperatorEntity } from '../entities/operator.entity';

interface GpsJob {
  vehicleId: string;
  operatorId: string;
  routeId?: string;
  tripId?: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKmh?: number;
  occupancy?: string;
  timestamp: string;
}

const VALID_OCCUPANCY = new Set<string>(Object.values(OccupancyLevel));
const SRI_LANKA_BOUNDS = { minLat: 5.9, maxLat: 9.9, minLng: 79.4, maxLng: 81.9 };

@Processor('gps.ingest')
export class GpsIngestProcessor {
  private readonly logger = new Logger(GpsIngestProcessor.name);

  constructor(
    private readonly trackingGateway: TrackingGateway,
    private readonly trackingService: TrackingService,
    @InjectRepository(OperatorEntity)
    private readonly operatorRepo: Repository<OperatorEntity>,
  ) {}

  @Process('ingest')
  async handleIngest(job: Job<GpsJob>) {
    const { vehicleId, routeId, tripId, lat, lng, heading, speedKmh, occupancy, timestamp } = job.data;

    if (lat < SRI_LANKA_BOUNDS.minLat || lat > SRI_LANKA_BOUNDS.maxLat ||
        lng < SRI_LANKA_BOUNDS.minLng || lng > SRI_LANKA_BOUNDS.maxLng) {
      this.logger.warn(`Vehicle ${vehicleId} GPS out of Sri Lanka bounds (${lat}, ${lng}) — dropped`);
      return;
    }

    const normalizedOccupancy = occupancy && VALID_OCCUPANCY.has(occupancy)
      ? (occupancy as OccupancyLevel)
      : undefined;

    const updatedAt = new Date(timestamp);

    // Update in-memory live state
    this.trackingService.updateVehicleLocation(vehicleId, routeId ?? null, {
      lat,
      lng,
      heading: heading ?? null,
      speedKmh: speedKmh ?? null,
      occupancy: normalizedOccupancy ?? null,
      updatedAt,
    });

    // Broadcast to subscribers
    this.trackingGateway.broadcastVehiclePosition(routeId ?? null, {
      vehicleId,
      routeId: routeId ?? null,
      tripId: tripId ?? null,
      lat,
      lng,
      heading: heading ?? null,
      speedKmh: speedKmh ?? null,
      occupancy: normalizedOccupancy ?? null,
      updatedAt: updatedAt.toISOString(),
    });

    this.logger.debug(`Vehicle ${vehicleId} @ (${lat}, ${lng}) route=${routeId ?? 'none'}`);
  }
}
