import { BusCategory, RouteStatus, StopStatus, TripStatus } from './enums';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface Province {
  id: number;
  name: string;
  nameSi: string | null;
  nameTa: string | null;
}

export interface District {
  id: number;
  provinceId: number;
  name: string;
  nameSi: string | null;
  nameTa: string | null;
}

export interface BusStop {
  id: string;
  stopCode: string | null;
  name: string;
  nameSi: string | null;
  nameTa: string | null;
  districtId: number | null;
  lat: number;
  lng: number;
  addressText: string | null;
  isTerminus: boolean;
  hasShelter: boolean;
  wheelchairAccessible: boolean;
  status: StopStatus;
  addedByOperatorId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Route {
  id: string;
  operatorId: string;
  routeNumber: string;
  name: string;
  nameSi: string | null;
  nameTa: string | null;
  originStopId: string;
  destStopId: string;
  busCategory: BusCategory;
  districtFrom: number | null;
  districtTo: number | null;
  path: GeoLineString | null;
  status: RouteStatus;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface RouteDirection {
  id: string;
  routeId: string;
  direction: 0 | 1;
  name: string | null;
  path: GeoLineString | null;
}

export interface RouteStop {
  id: string;
  routeId: string;
  direction: 0 | 1;
  stopId: string;
  sequence: number;
  fareStageNumber: number | null;
  isBoardingPoint: boolean;
  isAlightingPoint: boolean;
  distanceFromOrigin: number | null;
  createdAt: string;
}

export interface FareStage {
  id: string;
  routeId: string;
  stageNumber: number;
  name: string;
  nameSi: string | null;
  nameTa: string | null;
  stopId: string;
}

export interface Schedule {
  id: string;
  routeId: string;
  direction: 0 | 1;
  name: string | null;
  validFrom: string;
  validTo: string | null;
  daysOfWeek: number[];
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  scheduleId: string;
  routeId: string;
  direction: 0 | 1;
  vehicleId: string | null;
  driverId: string | null;
  conductorId: string | null;
  departureTime: string;
  arrivalTime: string;
  status: TripStatus;
  actualStart: string | null;
  actualEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripStopTime {
  id: string;
  tripId: string;
  routeStopId: string;
  sequence: number;
  scheduledArrive: string | null;
  scheduledDepart: string | null;
  actualArrive: string | null;
  actualDepart: string | null;
}

export interface VehicleType {
  id: string;
  name: string;
  nameSi: string | null;
  nameTa: string | null;
  category: BusCategory;
  seatCapacity: number;
  hasAc: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  operatorId: string;
  vehicleTypeId: string;
  registration: string;
  fleetId: string | null;
  year: number | null;
  status: string;
  gpsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
