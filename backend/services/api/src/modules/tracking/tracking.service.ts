import { Injectable } from '@nestjs/common';

interface LiveVehicleState {
  vehicleId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speedKmh: number | null;
  occupancy: string | null;
  updatedAt: Date;
}

@Injectable()
export class TrackingService {
  // In-memory map of vehicleId → live state (backed by Redis in production)
  private readonly liveState = new Map<string, LiveVehicleState>();

  updateVehicleLocation(vehicleId: string, state: Omit<LiveVehicleState, 'vehicleId'>) {
    this.liveState.set(vehicleId, { vehicleId, ...state });
  }

  getVehiclesOnRoute(routeId: string) {
    // Phase 2: query Redis for vehicles currently on this route
    // Phase 0: return stub response showing the tracking-unavailable pattern
    return {
      routeId,
      dataAvailable: false,
      lastUpdatedAt: null,
      vehicles: [],
      alerts: [],
      message: 'Live tracking is currently unavailable. Schedule-based estimates are being shown.',
    };
  }
}
