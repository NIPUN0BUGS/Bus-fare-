import { Injectable } from '@nestjs/common';

interface LiveVehicleState {
  vehicleId: string;
  routeId: string | null;
  lat: number;
  lng: number;
  heading: number | null;
  speedKmh: number | null;
  occupancy: string | null;
  updatedAt: Date;
}

const STALE_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class TrackingService {
  private readonly liveState = new Map<string, LiveVehicleState>();
  private readonly routeVehicles = new Map<string, Set<string>>();

  updateVehicleLocation(
    vehicleId: string,
    routeId: string | null,
    state: Omit<LiveVehicleState, 'vehicleId' | 'routeId'>,
  ) {
    const existing = this.liveState.get(vehicleId);
    if (existing?.routeId && existing.routeId !== routeId) {
      this.routeVehicles.get(existing.routeId)?.delete(vehicleId);
    }

    this.liveState.set(vehicleId, { vehicleId, routeId, ...state });

    if (routeId) {
      if (!this.routeVehicles.has(routeId)) this.routeVehicles.set(routeId, new Set());
      this.routeVehicles.get(routeId)!.add(vehicleId);
    }
  }

  getVehiclesOnRoute(routeId: string) {
    const ids = this.routeVehicles.get(routeId) ?? new Set<string>();
    const vehicles = [...ids]
      .map((id) => this.liveState.get(id))
      .filter((v): v is LiveVehicleState => v !== undefined && !this.isStale(v))
      .map((v) => this.toPublic(v));

    return {
      routeId,
      dataAvailable: vehicles.length > 0,
      lastUpdatedAt: vehicles.length > 0
        ? new Date(Math.max(...vehicles.map((v) => new Date(v.updatedAt).getTime()))).toISOString()
        : null,
      vehicles,
      alerts: [],
    };
  }

  getAllVehicles() {
    return [...this.liveState.values()]
      .filter((v) => !this.isStale(v))
      .map((v) => this.toPublic(v));
  }

  private isStale(v: LiveVehicleState) {
    return Date.now() - v.updatedAt.getTime() > STALE_MS;
  }

  private toPublic(v: LiveVehicleState) {
    return {
      vehicleId: v.vehicleId,
      routeId: v.routeId,
      lat: v.lat,
      lng: v.lng,
      heading: v.heading,
      speedKmh: v.speedKmh,
      occupancy: v.occupancy,
      updatedAt: v.updatedAt.toISOString(),
    };
  }
}
