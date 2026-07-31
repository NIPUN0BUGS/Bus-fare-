import { BusCategory, FareSourceType, PassengerType } from '@buslanka/shared-types';
import {
  FareEngineContext,
  FareEngineInput,
  FareEngineResult,
  FareRuleRecord,
  PASSENGER_MULTIPLIERS,
  PromotionRecord,
  RouteStopRecord,
} from './types';

export class FareEngine {
  private readonly context: FareEngineContext;

  constructor(context: FareEngineContext) {
    this.context = context;
  }

  calculate(input: FareEngineInput): FareEngineResult {
    const { routeId, fromStopId, toStopId, passengerType, busCategory, travelDate } = input;

    // Step 1: Resolve fare stages for both stops
    const stageFrom = this.getStageForStop(routeId, fromStopId);
    const stageTo = this.getStageForStop(routeId, toStopId);

    if (stageFrom === null || stageTo === null) {
      return this.unavailableResult(
        passengerType,
        busCategory,
        stageFrom,
        stageTo,
        'Stop not mapped to a fare stage on this route.',
      );
    }

    // Step 2: Normalise direction (fare is the same in both directions)
    const normalStageFrom = Math.min(stageFrom, stageTo);
    const normalStageTo = Math.max(stageFrom, stageTo);

    // Step 3: Find best fare rule (NTC_OFFICIAL > OPERATOR > ESTIMATED)
    const rule = this.findBestFareRule(
      routeId,
      busCategory,
      normalStageFrom,
      normalStageTo,
      passengerType,
      travelDate,
    );

    if (!rule) {
      // Step 4a: No explicit rule — try passenger type fallback via adult fare + multiplier
      const adultRule = this.findBestFareRule(
        routeId,
        busCategory,
        normalStageFrom,
        normalStageTo,
        PassengerType.ADULT,
        travelDate,
      );

      if (adultRule && passengerType !== PassengerType.CONCESSION) {
        const multiplier = PASSENGER_MULTIPLIERS[passengerType];
        const derived = this.roundFare(adultRule.baseFare * multiplier);
        const promotionDiscount = this.applyPromotions(
          derived,
          routeId,
          busCategory,
          passengerType,
          travelDate,
        );

        return {
          amount: promotionDiscount.finalFare,
          currency: 'LKR',
          status: adultRule.sourceType,
          sourceName: adultRule.sourceName,
          sourceType: adultRule.sourceType,
          revisionCode: adultRule.revisionCode,
          effectiveFrom: adultRule.effectiveFrom,
          passengerType,
          busCategory,
          stageFrom: normalStageFrom,
          stageTo: normalStageTo,
          discountApplied: promotionDiscount.discountAmount,
          updatedAt: adultRule.updatedAt,
          disclaimer:
            `${this.passengerTypeLabel(passengerType)} fare derived from adult fare. ` +
            'Confirm with the conductor.',
        };
      }

      if (passengerType === PassengerType.CONCESSION) {
        return this.unavailableResult(
          passengerType,
          busCategory,
          normalStageFrom,
          normalStageTo,
          'Concession fares are not configured for this route. Please confirm eligibility with the conductor.',
        );
      }

      // Step 4b: No operator rule at all — try distance-based estimate
      return this.estimateFromDistance(
        fromStopId,
        toStopId,
        passengerType,
        busCategory,
        normalStageFrom,
        normalStageTo,
      );
    }

    // Step 5: Apply promotions
    const promotionResult = this.applyPromotions(
      rule.baseFare,
      routeId,
      busCategory,
      passengerType,
      travelDate,
    );

    return {
      amount: promotionResult.finalFare,
      currency: 'LKR',
      status: rule.sourceType,
      sourceName: rule.sourceName,
      sourceType: rule.sourceType,
      revisionCode: rule.revisionCode,
      effectiveFrom: rule.effectiveFrom,
      passengerType,
      busCategory,
      stageFrom: normalStageFrom,
      stageTo: normalStageTo,
      discountApplied: promotionResult.discountAmount,
      updatedAt: rule.updatedAt,
      disclaimer: null,
    };
  }

  private getStageForStop(routeId: string, stopId: string): number | null {
    const stop = this.context.routeStops.find(
      (s) => s.routeId === routeId && s.stopId === stopId,
    );
    return stop?.fareStageNumber ?? null;
  }

  private findBestFareRule(
    routeId: string,
    busCategory: BusCategory,
    stageFrom: number,
    stageTo: number,
    passengerType: PassengerType,
    travelDate: Date,
  ): FareRuleRecord | null {
    const candidates = this.context.fareRules
      .filter(
        (r) =>
          r.routeId === routeId &&
          r.busCategory === busCategory &&
          r.stageFrom === stageFrom &&
          r.stageTo === stageTo &&
          r.passengerType === passengerType &&
          r.effectiveFrom <= travelDate &&
          (r.effectiveTo === null || r.effectiveTo > travelDate),
      )
      .sort((a, b) => {
        // NTC_OFFICIAL first, then OPERATOR, then ESTIMATED
        const priority: Record<FareSourceType, number> = {
          [FareSourceType.NTC_OFFICIAL]: 1,
          [FareSourceType.OPERATOR]: 2,
          [FareSourceType.ESTIMATED]: 3,
          [FareSourceType.UNAVAILABLE]: 4,
        };
        const pDiff = (priority[a.sourceType] ?? 99) - (priority[b.sourceType] ?? 99);
        if (pDiff !== 0) return pDiff;
        // Same priority: prefer most recent effective_from
        return b.effectiveFrom.getTime() - a.effectiveFrom.getTime();
      });

    return candidates[0] ?? null;
  }

  private applyPromotions(
    baseFare: number,
    routeId: string,
    busCategory: BusCategory,
    passengerType: PassengerType,
    travelDate: Date,
  ): { finalFare: number; discountAmount: number } {
    const activePromotions = this.context.promotions.filter(
      (p) =>
        p.validFrom <= travelDate &&
        p.validTo >= travelDate &&
        p.eligiblePassengerTypes.includes(passengerType) &&
        p.eligibleBusCategories.includes(busCategory) &&
        (p.eligibleRouteIds === null || p.eligibleRouteIds.includes(routeId)),
    );

    let remaining = baseFare;
    let totalDiscount = 0;

    const ntcMin = this.getNtcMinimum(busCategory);

    for (const promo of activePromotions) {
      if (remaining <= ntcMin) break;

      let discount = 0;
      if (promo.discountType === 'PERCENTAGE') {
        discount = remaining * (promo.discountValue / 100);
      } else {
        discount = promo.discountValue;
      }

      const newFare = Math.max(remaining - discount, ntcMin);
      totalDiscount += remaining - newFare;
      remaining = newFare;
    }

    const finalFare = this.roundFare(remaining);
    return {
      finalFare,
      // Discount is the actual money saved after rounding, not the pre-round discount
      discountAmount: Math.round(baseFare - finalFare),
    };
  }

  private estimateFromDistance(
    fromStopId: string,
    toStopId: string,
    passengerType: PassengerType,
    busCategory: BusCategory,
    stageFrom: number | null,
    stageTo: number | null,
  ): FareEngineResult {
    const fromStop = this.context.routeStops.find((s) => s.stopId === fromStopId);
    const toStop = this.context.routeStops.find((s) => s.stopId === toStopId);

    if (
      !fromStop ||
      !toStop ||
      fromStop.distanceFromOriginKm === null ||
      toStop.distanceFromOriginKm === null
    ) {
      return this.unavailableResult(passengerType, busCategory, stageFrom, stageTo);
    }

    const distanceKm = Math.abs(
      toStop.distanceFromOriginKm - fromStop.distanceFromOriginKm,
    );

    const band = this.context.distanceBands
      .slice()
      .sort((a, b) => a.minKm - b.minKm)
      .find((b) => distanceKm >= b.minKm && distanceKm < b.maxKm);

    if (!band) {
      return this.unavailableResult(passengerType, busCategory, stageFrom, stageTo);
    }

    const multiplier = PASSENGER_MULTIPLIERS[passengerType];
    const estimated = this.roundFare(band.adultFare * multiplier);

    return {
      amount: estimated,
      currency: 'LKR',
      status: FareSourceType.ESTIMATED,
      sourceName: 'Distance-based estimate',
      sourceType: FareSourceType.ESTIMATED,
      revisionCode: null,
      effectiveFrom: null,
      passengerType,
      busCategory,
      stageFrom,
      stageTo,
      discountApplied: 0,
      updatedAt: null,
      disclaimer:
        'This is an estimated fare based on route distance. ' +
        'The official fare has not been submitted by the operator. ' +
        'Please confirm the exact fare with the conductor.',
    };
  }

  private unavailableResult(
    passengerType: PassengerType,
    busCategory: BusCategory,
    stageFrom: number | null,
    stageTo: number | null,
    disclaimer?: string,
  ): FareEngineResult {
    return {
      amount: null,
      currency: 'LKR',
      status: FareSourceType.UNAVAILABLE,
      sourceName: null,
      sourceType: null,
      revisionCode: null,
      effectiveFrom: null,
      passengerType,
      busCategory,
      stageFrom,
      stageTo,
      discountApplied: 0,
      updatedAt: null,
      disclaimer: disclaimer ?? 'Fare data is unavailable for this journey.',
    };
  }

  private getNtcMinimum(busCategory: BusCategory): number {
    const limit = this.context.ntcLimits.find((l) => l.category === busCategory);
    return limit?.minFare ?? 10;
  }

  private passengerTypeLabel(type: PassengerType): string {
    const labels: Record<PassengerType, string> = {
      [PassengerType.ADULT]: 'Adult',
      [PassengerType.CHILD]: 'Child',
      [PassengerType.STUDENT]: 'Student',
      [PassengerType.SENIOR]: 'Senior',
      [PassengerType.CONCESSION]: 'Concession',
    };
    return labels[type];
  }

  // Round to nearest whole rupee (0.50 rounds up)
  static roundFare(amount: number): number {
    return Math.ceil(amount);
  }

  private roundFare(amount: number): number {
    return FareEngine.roundFare(amount);
  }
}

export function validateFareSubmission(params: {
  stageFrom: number;
  stageTo: number;
  baseFare: number;
  busCategory: BusCategory;
  ntcLimits: Array<{ category: BusCategory; minFare: number; maxFare: number | null }>;
  existingRules: Array<{ stageFrom: number; stageTo: number; baseFare: number }>;
}): string[] {
  const errors: string[] = [];

  if (params.stageFrom >= params.stageTo) {
    errors.push('stage_from must be less than stage_to.');
  }

  if (params.baseFare <= 0) {
    errors.push('base_fare must be greater than zero.');
  }

  const ntcLimit = params.ntcLimits.find((l) => l.category === params.busCategory);
  if (ntcLimit) {
    if (params.baseFare < ntcLimit.minFare) {
      errors.push(
        `Fare LKR ${params.baseFare} is below the NTC minimum of LKR ${ntcLimit.minFare} for ${params.busCategory}.`,
      );
    }
    if (ntcLimit.maxFare !== null && params.baseFare > ntcLimit.maxFare) {
      errors.push(
        `Fare LKR ${params.baseFare} exceeds the NTC maximum of LKR ${ntcLimit.maxFare} for ${params.busCategory}.`,
      );
    }
  }

  // Check monotonic increase: fare(1→4) must be ≥ fare(1→3) ≥ fare(1→2)
  for (const existing of params.existingRules) {
    if (
      existing.stageFrom === params.stageFrom &&
      existing.stageTo < params.stageTo &&
      existing.baseFare > params.baseFare
    ) {
      errors.push(
        `Fare for Stage ${params.stageFrom}→${params.stageTo} (LKR ${params.baseFare}) ` +
          `must be ≥ fare for Stage ${existing.stageFrom}→${existing.stageTo} ` +
          `(LKR ${existing.baseFare}).`,
      );
    }
  }

  return errors;
}
