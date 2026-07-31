import { AlertSeverity, AlertType, OccupancyLevel } from './enums';

export interface VehicleLocation {
  id: string;
  vehicleId: string;
  tripId: string | null;
  lat: number;
  lng: number;
  heading: number | null;
  speedKmh: number | null;
  occupancy: OccupancyLevel | null;
  recordedAt: string;
  receivedAt: string;
  isStale: boolean;
}

export interface LiveVehiclePosition {
  vehicleId: string;
  vehicleReg: string;
  fleetId: string | null;
  lat: number;
  lng: number;
  heading: number | null;
  speedKmh: number | null;
  occupancy: OccupancyLevel | null;
  nextStopId: string | null;
  nextStopName: string | null;
  etaNextStopMinutes: number | null;
  direction: 0 | 1;
  tripId: string | null;
  updatedAt: string;
}

export interface ServiceAlert {
  id: string;
  operatorId: string | null;
  routeId: string | null;
  tripId: string | null;
  vehicleId: string | null;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  titleSi: string | null;
  titleTa: string | null;
  description: string | null;
  affectedStops: string[];
  startsAt: string;
  endsAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingStatus {
  available: boolean;
  reason: string | null;
  message: string | null;
  estimatedResumption: string | null;
}

// WebSocket message types
export type WsMessageType =
  | 'SUBSCRIBE'
  | 'UNSUBSCRIBE'
  | 'VEHICLE_POSITION'
  | 'SERVICE_ALERT'
  | 'TRACKING_UNAVAILABLE'
  | 'ACK'
  | 'REJECTED'
  | 'LOCATION_UPDATE';

export interface WsSubscribeMessage {
  type: 'SUBSCRIBE';
  routeId: string;
  tripId?: string;
}

export interface WsVehiclePositionMessage {
  type: 'VEHICLE_POSITION';
  vehicleId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speedKmh: number | null;
  occupancy: OccupancyLevel | null;
  nextStop: string | null;
  etaMinutes: number | null;
  updatedAt: string;
}

export interface WsServiceAlertMessage {
  type: 'SERVICE_ALERT';
  alertId: string;
  severity: AlertSeverity;
  message: string;
  messageSi: string | null;
  messageTa: string | null;
}

export interface WsTrackingUnavailableMessage {
  type: 'TRACKING_UNAVAILABLE';
  reason: string;
  message: string;
}

export interface WsLocationUpdateMessage {
  type: 'LOCATION_UPDATE';
  vehicleId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speedKmh: number | null;
  occupancy: OccupancyLevel | null;
  timestamp: string;
}
