import { BusCategory, FareSourceType, PassengerType } from '@buslanka/shared-types';

export interface FareRuleRecord {
  id: string;
  routeId: string;
  busCategory: BusCategory;
  stageFrom: number;
  stageTo: number;
  passengerType: PassengerType;
  baseFare: number;
  sourceType: FareSourceType;
  sourceName: string;
  revisionCode: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  updatedAt: Date;
}

export interface RouteStopRecord {
  routeId: string;
  stopId: string;
  fareStageNumber: number | null;
  distanceFromOriginKm: number | null;
}

export interface DistanceBandEntry {
  minKm: number;
  maxKm: number;
  adultFare: number;
}

export interface PromotionRecord {
  id: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minFare: number;
  eligiblePassengerTypes: PassengerType[];
  eligibleBusCategories: BusCategory[];
  eligibleRouteIds: string[] | null;
  validFrom: Date;
  validTo: Date;
}

export interface NtcLimits {
  minFare: number;
  maxFare: number | null;
  category: BusCategory;
}

export interface FareEngineInput {
  routeId: string;
  fromStopId: string;
  toStopId: string;
  passengerType: PassengerType;
  busCategory: BusCategory;
  travelDate: Date;
}

export interface FareEngineContext {
  fareRules: FareRuleRecord[];
  routeStops: RouteStopRecord[];
  distanceBands: DistanceBandEntry[];
  promotions: PromotionRecord[];
  ntcLimits: NtcLimits[];
}

export interface FareEngineResult {
  amount: number | null;
  currency: 'LKR';
  status: FareSourceType;
  sourceName: string | null;
  sourceType: FareSourceType | null;
  revisionCode: string | null;
  effectiveFrom: Date | null;
  passengerType: PassengerType;
  busCategory: BusCategory;
  stageFrom: number | null;
  stageTo: number | null;
  discountApplied: number;
  updatedAt: Date | null;
  disclaimer: string | null;
}

export const PASSENGER_MULTIPLIERS: Record<PassengerType, number> = {
  [PassengerType.ADULT]: 1.0,
  [PassengerType.CHILD]: 0.5,
  [PassengerType.STUDENT]: 0.75,
  [PassengerType.SENIOR]: 0.75,
  [PassengerType.CONCESSION]: 0.5,
};
