import {
  BookingStatus,
  BusCategory,
  Currency,
  PassengerType,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  TicketStatus,
} from './enums';

export interface Booking {
  id: string;
  reference: string;
  passengerId: string;
  tripId: string;
  fromStopId: string;
  toStopId: string;
  passengerType: PassengerType;
  busCategory: BusCategory;
  seatNumber: string | null;
  fareAmount: number;
  fareCurrency: Currency;
  fareRuleId: string | null;
  status: BookingStatus;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  bookingId: string;
  qrPayload: string;
  qrVersion: number;
  issuedAt: string;
  validFrom: string;
  validTo: string;
  validatedAt: string | null;
  validatedBy: string | null;
  validationMode: 'ONLINE' | 'OFFLINE' | null;
  status: TicketStatus;
  createdAt: string;
}

export interface QrTicketPayload {
  iss: string;
  sub: string;
  iat: number;
  exp: number;
  t: {
    bid: string;
    tid: string;
    fsi: string;
    tsi: string;
    pt: PassengerType;
    sn: string | null;
    f: number;
    cur: Currency;
  };
}

export interface Seat {
  id: string;
  vehicleId: string;
  seatNumber: string;
  seatType: 'STANDARD' | 'PREMIUM';
  rowNumber: number | null;
  columnNumber: number | null;
  isWindow: boolean;
  accessible: boolean;
  active: boolean;
}

export interface SeatReservation {
  id: string;
  bookingId: string;
  tripId: string;
  seatId: string;
  lockedAt: string;
  releasedAt: string | null;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  gateway: string;
  gatewayIntentId: string | null;
  gatewayChargeId: string | null;
  status: PaymentStatus;
  failureReason: string | null;
  initiatedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: Currency;
  reason: string;
  gatewayRefundId: string | null;
  status: RefundStatus;
  requestedAt: string;
  processedAt: string | null;
  processedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
