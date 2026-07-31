import { BusCategory, Currency, FareSourceType, PassengerType } from './enums';

export interface FareRule {
  id: string;
  routeId: string;
  operatorId: string;
  busCategory: BusCategory;
  stageFrom: number;
  stageTo: number;
  passengerType: PassengerType;
  baseFare: number;
  currency: Currency;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceType: FareSourceType;
  ntcRevisionId: string | null;
  submittedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FareRevision {
  id: string;
  revisionCode: string;
  title: string;
  effectiveDate: string;
  gazetteUrl: string | null;
  notes: string | null;
  publishedBy: string | null;
  createdAt: string;
}

export interface FareSource {
  type: FareSourceType;
  name: string;
  revisionCode: string | null;
  effectiveFrom: string;
}

export interface FareResult {
  amount: number | null;
  currency: Currency;
  status: FareSourceType;
  statusLabel: string;
  source: FareSource | null;
  passengerType: PassengerType;
  busCategory: BusCategory;
  stageFrom: number | null;
  stageTo: number | null;
  discountApplied: number;
  updatedAt: string | null;
  disclaimer: string | null;
}

export interface LegFare extends FareResult {
  legIndex: number;
  routeId: string;
  fromStopId: string;
  toStopId: string;
}

export interface JourneyFare {
  totalAmount: number | null;
  currency: Currency;
  status: 'CONFIRMED' | 'ESTIMATED' | 'PARTIAL' | 'UNAVAILABLE';
  legs: LegFare[];
  hasUnavailableLeg: boolean;
  disclaimer: string | null;
}
