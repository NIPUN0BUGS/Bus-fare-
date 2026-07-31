import { BusCategory, OccupancyLevel, PassengerType } from './enums';
import { FareResult } from './fare.types';
import { LiveVehiclePosition, ServiceAlert } from './tracking.types';
import { BusStop, Route } from './route.types';

// ── Generic API response envelope ─────────────────────────────────────────────

export interface ApiMeta {
  page?: number;
  perPage?: number;
  total?: number;
  requestId: string;
  executionMs?: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Journey Search ─────────────────────────────────────────────────────────────

export interface JourneyLeg {
  legIndex: number;
  routeNumber: string;
  routeName: string;
  operator: { id: string; name: string };
  busCategory: BusCategory;
  fromStop: Pick<BusStop, 'id' | 'name' | 'nameSi' | 'nameTa' | 'lat' | 'lng'> & {
    code: string | null;
  };
  toStop: Pick<BusStop, 'id' | 'name' | 'nameSi' | 'nameTa' | 'lat' | 'lng'> & {
    code: string | null;
  };
  scheduledDeparture: string;
  scheduledArrival: string;
  durationMinutes: number;
  fare: FareResult;
  liveTracking: {
    available: boolean;
    vehicleId: string | null;
    vehicleReg: string | null;
    lastUpdateAt: string | null;
    nextStop: string | null;
    etaMinutes: number | null;
    occupancy: OccupancyLevel | null;
  };
  ticketBooking: {
    available: boolean;
    reason: string | null;
  };
  accessibility: {
    wheelchairAccessible: boolean;
  };
}

export interface Journey {
  id: string;
  totalFare: {
    amount: number | null;
    currency: string;
    status: string;
    source: string | null;
    effectiveFrom: string | null;
    updatedAt: string | null;
  };
  totalDurationMinutes: number;
  transfers: number;
  legs: JourneyLeg[];
}

export interface JourneySearchParams {
  fromLat?: number;
  fromLng?: number;
  fromText?: string;
  toLat?: number;
  toLng?: number;
  toText?: string;
  departureDate?: string;
  departureTime?: string;
  passengerType?: PassengerType;
  maxTransfers?: number;
  sortBy?: 'DEPARTURE' | 'FARE' | 'DURATION' | 'TRANSFERS';
  busCategory?: BusCategory;
  accessible?: boolean;
}

export interface JourneySearchResponse {
  journeys: Journey[];
  resolvedFrom: { text: string; lat: number; lng: number; type: string };
  resolvedTo: { text: string; lat: number; lng: number; type: string };
}

// ── Tracking ───────────────────────────────────────────────────────────────────

export interface TrackingResponse {
  routeId: string;
  dataAvailable: boolean;
  lastUpdatedAt: string | null;
  vehicles: LiveVehiclePosition[];
  alerts: ServiceAlert[];
}

// ── Nearby Stops ───────────────────────────────────────────────────────────────

export interface NearbyStop extends BusStop {
  distanceMeters: number;
  routes: Array<{ number: string; destination: string }>;
  hasLiveTracking: boolean;
}

// ── Autocomplete ───────────────────────────────────────────────────────────────

export interface AutocompleteSuggestion {
  id: string;
  type: 'BUS_STOP' | 'PLACE' | 'LANDMARK';
  label: string;
  labelSi: string | null;
  labelTa: string | null;
  lat: number;
  lng: number;
}

// ── Operator GPS Ingest ────────────────────────────────────────────────────────

export interface GpsUpdateRequest {
  tripId?: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKmh?: number;
  occupancy?: OccupancyLevel;
  timestamp: string;
}

// ── Booking ────────────────────────────────────────────────────────────────────

export interface CreateBookingRequest {
  tripId: string;
  fromStopId: string;
  toStopId: string;
  passengerType: PassengerType;
  seatId?: string;
}

export interface BookingFareSummary {
  amount: number;
  currency: string;
  bookingFee: number;
  total: number;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export interface RouteWithStops extends Route {
  stops: Array<{
    stopId: string;
    sequence: number;
    direction: 0 | 1;
    fareStageNumber: number | null;
    stop: BusStop;
  }>;
}
