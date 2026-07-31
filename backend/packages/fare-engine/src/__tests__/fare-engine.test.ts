import { BusCategory, FareSourceType, PassengerType } from '@buslanka/shared-types';
import { FareEngine, validateFareSubmission } from '../fare-engine';
import { FareEngineContext, FareRuleRecord, RouteStopRecord } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const TRAVEL_DATE = new Date('2026-07-30');
const ROUTE_177 = 'route-177';

const STOP_NUGEGODA = 'stop-nugegoda';
const STOP_KIRULAPONA = 'stop-kirulapona';
const STOP_BORELLA = 'stop-borella';
const STOP_FORT = 'stop-fort';
const STOP_UNLISTED = 'stop-unlisted';

const routeStops: RouteStopRecord[] = [
  { routeId: ROUTE_177, stopId: STOP_NUGEGODA,   fareStageNumber: 1, distanceFromOriginKm: 0 },
  { routeId: ROUTE_177, stopId: STOP_KIRULAPONA, fareStageNumber: 2, distanceFromOriginKm: 4.5 },
  { routeId: ROUTE_177, stopId: STOP_BORELLA,    fareStageNumber: 3, distanceFromOriginKm: 9.2 },
  { routeId: ROUTE_177, stopId: STOP_FORT,       fareStageNumber: 4, distanceFromOriginKm: 14.1 },
];

const ntcRule = (stageFrom: number, stageTo: number, amount: number, paxType = PassengerType.ADULT): FareRuleRecord => ({
  id: `ntc-${stageFrom}-${stageTo}-${paxType}`,
  routeId: ROUTE_177,
  busCategory: BusCategory.ORDINARY,
  stageFrom,
  stageTo,
  passengerType: paxType,
  baseFare: amount,
  sourceType: FareSourceType.NTC_OFFICIAL,
  sourceName: 'National Transport Commission',
  revisionCode: 'NTC-2026-003',
  effectiveFrom: new Date('2026-03-01'),
  effectiveTo: null,
  updatedAt: new Date('2026-07-01'),
});

const baseContext: FareEngineContext = {
  fareRules: [
    ntcRule(1, 2, 18),
    ntcRule(1, 3, 28),
    ntcRule(1, 4, 42),
    ntcRule(2, 3, 18),
    ntcRule(2, 4, 28),
    ntcRule(3, 4, 18),
  ],
  routeStops,
  distanceBands: [
    { minKm: 0, maxKm: 5, adultFare: 18 },
    { minKm: 5, maxKm: 10, adultFare: 24 },
    { minKm: 10, maxKm: 20, adultFare: 36 },
    { minKm: 20, maxKm: 35, adultFare: 52 },
    { minKm: 35, maxKm: 60, adultFare: 78 },
  ],
  promotions: [],
  ntcLimits: [
    { minFare: 10, maxFare: null, category: BusCategory.ORDINARY },
    { minFare: 10, maxFare: 450, category: BusCategory.EXPRESSWAY },
  ],
};

function makeEngine(overrides: Partial<FareEngineContext> = {}): FareEngine {
  return new FareEngine({ ...baseContext, ...overrides });
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-01: Standard adult ordinary fare
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-01: Standard adult ordinary fare', () => {
  it('returns LKR 42.00 confirmed from NTC for adult Stage 1→4', () => {
    const engine = makeEngine();
    const result = engine.calculate({
      routeId: ROUTE_177,
      fromStopId: STOP_NUGEGODA,
      toStopId: STOP_FORT,
      passengerType: PassengerType.ADULT,
      busCategory: BusCategory.ORDINARY,
      travelDate: TRAVEL_DATE,
    });

    expect(result.amount).toBe(42);
    expect(result.status).toBe(FareSourceType.NTC_OFFICIAL);
    expect(result.stageFrom).toBe(1);
    expect(result.stageTo).toBe(4);
    expect(result.currency).toBe('LKR');
    expect(result.disclaimer).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-02: Child ordinary fare (50% of adult, rounded up)
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-02: Child ordinary fare', () => {
  it('returns LKR 21 (ceil of 42 × 0.50) for child Stage 1→4', () => {
    const engine = makeEngine();
    const result = engine.calculate({
      routeId: ROUTE_177,
      fromStopId: STOP_NUGEGODA,
      toStopId: STOP_FORT,
      passengerType: PassengerType.CHILD,
      busCategory: BusCategory.ORDINARY,
      travelDate: TRAVEL_DATE,
    });

    expect(result.amount).toBe(21);
    expect(result.status).toBe(FareSourceType.NTC_OFFICIAL);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-03: Fare unavailable — no rules exist for route
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-03: Fare unavailable', () => {
  it('returns UNAVAILABLE when no rules exist for route', () => {
    const engine = makeEngine();
    const result = engine.calculate({
      routeId: 'route-888',
      fromStopId: STOP_NUGEGODA,
      toStopId: STOP_BORELLA,
      passengerType: PassengerType.ADULT,
      busCategory: BusCategory.ORDINARY,
      travelDate: TRAVEL_DATE,
    });

    expect(result.status).toBe(FareSourceType.UNAVAILABLE);
    expect(result.amount).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-04: Estimated fare via distance fallback
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-04: Estimated fare (distance fallback)', () => {
  it('returns estimated fare when no fare rules exist but distance data does', () => {
    const engine = makeEngine({ fareRules: [] });
    const result = engine.calculate({
      routeId: ROUTE_177,
      fromStopId: STOP_NUGEGODA,
      toStopId: STOP_FORT,
      passengerType: PassengerType.ADULT,
      busCategory: BusCategory.ORDINARY,
      travelDate: TRAVEL_DATE,
    });

    expect(result.status).toBe(FareSourceType.ESTIMATED);
    expect(result.amount).toBeGreaterThan(0);
    expect(result.disclaimer).toContain('estimated fare');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-05: Future-dated NTC revision applied for future travel date
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-05: Future-dated NTC revision', () => {
  it('returns revised fare for travel after revision effective date', () => {
    const newRule: FareRuleRecord = {
      id: 'ntc-new',
      routeId: ROUTE_177,
      busCategory: BusCategory.ORDINARY,
      stageFrom: 1,
      stageTo: 4,
      passengerType: PassengerType.ADULT,
      baseFare: 46,
      sourceType: FareSourceType.NTC_OFFICIAL,
      sourceName: 'National Transport Commission',
      revisionCode: 'NTC-2026-007',
      effectiveFrom: new Date('2026-08-01'),
      effectiveTo: null,
      updatedAt: new Date('2026-07-15'),
    };

    const engine = makeEngine({
      fareRules: [...baseContext.fareRules, newRule],
    });

    const resultBefore = engine.calculate({
      routeId: ROUTE_177,
      fromStopId: STOP_NUGEGODA,
      toStopId: STOP_FORT,
      passengerType: PassengerType.ADULT,
      busCategory: BusCategory.ORDINARY,
      travelDate: new Date('2026-07-31'),
    });
    expect(resultBefore.amount).toBe(42);

    const resultAfter = engine.calculate({
      routeId: ROUTE_177,
      fromStopId: STOP_NUGEGODA,
      toStopId: STOP_FORT,
      passengerType: PassengerType.ADULT,
      busCategory: BusCategory.ORDINARY,
      travelDate: new Date('2026-08-15'),
    });
    expect(resultAfter.amount).toBe(46);
    expect(resultAfter.revisionCode).toBe('NTC-2026-007');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-06: NTC rule overrides operator-submitted fare
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-06: NTC overrides operator fare', () => {
  it('uses NTC fare (42) over higher operator fare (45)', () => {
    const operatorRule: FareRuleRecord = {
      id: 'op-177-1-4',
      routeId: ROUTE_177,
      busCategory: BusCategory.ORDINARY,
      stageFrom: 1,
      stageTo: 4,
      passengerType: PassengerType.ADULT,
      baseFare: 45,
      sourceType: FareSourceType.OPERATOR,
      sourceName: 'Jayantha Express',
      revisionCode: null,
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null,
      updatedAt: new Date('2026-01-01'),
    };

    const engine = makeEngine({
      fareRules: [...baseContext.fareRules, operatorRule],
    });

    const result = engine.calculate({
      routeId: ROUTE_177,
      fromStopId: STOP_NUGEGODA,
      toStopId: STOP_FORT,
      passengerType: PassengerType.ADULT,
      busCategory: BusCategory.ORDINARY,
      travelDate: TRAVEL_DATE,
    });

    expect(result.amount).toBe(42);
    expect(result.status).toBe(FareSourceType.NTC_OFFICIAL);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-07: Fare exceeds NTC ceiling — validation rejects it
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-07: Fare submission validation — exceeds NTC ceiling', () => {
  it('rejects fare of LKR 600 for expressway AC where NTC max is LKR 450', () => {
    const errors = validateFareSubmission({
      stageFrom: 1,
      stageTo: 4,
      baseFare: 600,
      busCategory: BusCategory.EXPRESSWAY,
      ntcLimits: [{ category: BusCategory.EXPRESSWAY, minFare: 50, maxFare: 450 }],
      existingRules: [],
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('exceeds the NTC maximum'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-08: Multi-leg fare with one unavailable leg
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-08: Multi-leg — one unavailable leg', () => {
  it('returns confirmed leg1 fare and unavailable for leg2', () => {
    const engine = makeEngine();

    const leg1 = engine.calculate({
      routeId: ROUTE_177,
      fromStopId: STOP_NUGEGODA,
      toStopId: STOP_FORT,
      passengerType: PassengerType.ADULT,
      busCategory: BusCategory.ORDINARY,
      travelDate: TRAVEL_DATE,
    });

    const leg2 = engine.calculate({
      routeId: 'route-888',
      fromStopId: STOP_FORT,
      toStopId: 'stop-kandy',
      passengerType: PassengerType.ADULT,
      busCategory: BusCategory.ORDINARY,
      travelDate: TRAVEL_DATE,
    });

    expect(leg1.amount).toBe(42);
    expect(leg1.status).toBe(FareSourceType.NTC_OFFICIAL);
    expect(leg2.amount).toBeNull();
    expect(leg2.status).toBe(FareSourceType.UNAVAILABLE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-09: Promotion applied
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-09: Promotion applied', () => {
  it('reduces fare by 10% and rounds up', () => {
    const engine = makeEngine({
      promotions: [
        {
          id: 'promo-10pct',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          minFare: 0,
          eligiblePassengerTypes: [PassengerType.ADULT],
          eligibleBusCategories: [BusCategory.ORDINARY],
          eligibleRouteIds: null,
          validFrom: new Date('2026-07-01'),
          validTo: new Date('2026-07-31'),
        },
      ],
    });

    const result = engine.calculate({
      routeId: ROUTE_177,
      fromStopId: STOP_NUGEGODA,
      toStopId: STOP_FORT,
      passengerType: PassengerType.ADULT,
      busCategory: BusCategory.ORDINARY,
      travelDate: TRAVEL_DATE,
    });

    // 42 × 0.90 = 37.80 → ceil = 38
    expect(result.amount).toBe(38);
    expect(result.discountApplied).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-10: Stage normalisation (inbound = same fare as outbound)
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-10: Stage direction normalised (inbound journey)', () => {
  it('returns LKR 42 for Fort→Nugegoda (Stage 4→1 normalised to 1→4)', () => {
    const engine = makeEngine();
    const result = engine.calculate({
      routeId: ROUTE_177,
      fromStopId: STOP_FORT,      // stage 4
      toStopId: STOP_NUGEGODA,    // stage 1
      passengerType: PassengerType.ADULT,
      busCategory: BusCategory.ORDINARY,
      travelDate: TRAVEL_DATE,
    });

    expect(result.amount).toBe(42);
    expect(result.stageFrom).toBe(1);
    expect(result.stageTo).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-11: Student fare derived from adult via multiplier
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-11: Student fare derived from adult multiplier', () => {
  it('returns ceil(42 × 0.75) = 32 for student with no explicit student rule', () => {
    const engine = makeEngine();
    const result = engine.calculate({
      routeId: ROUTE_177,
      fromStopId: STOP_NUGEGODA,
      toStopId: STOP_FORT,
      passengerType: PassengerType.STUDENT,
      busCategory: BusCategory.ORDINARY,
      travelDate: TRAVEL_DATE,
    });

    // 42 × 0.75 = 31.50 → ceil = 32
    expect(result.amount).toBe(32);
    expect(result.status).toBe(FareSourceType.NTC_OFFICIAL);
    expect(result.disclaimer).toContain('derived from adult fare');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-12: Concession — not configured → UNAVAILABLE
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-12: Concession fare not configured', () => {
  it('returns UNAVAILABLE for concession with a specific disclaimer', () => {
    const engine = makeEngine();
    const result = engine.calculate({
      routeId: ROUTE_177,
      fromStopId: STOP_NUGEGODA,
      toStopId: STOP_FORT,
      passengerType: PassengerType.CONCESSION,
      busCategory: BusCategory.ORDINARY,
      travelDate: TRAVEL_DATE,
    });

    expect(result.status).toBe(FareSourceType.UNAVAILABLE);
    expect(result.amount).toBeNull();
    expect(result.disclaimer).toContain('Concession fares are not configured');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rounding
// ─────────────────────────────────────────────────────────────────────────────
describe('FareEngine.roundFare', () => {
  it('rounds 31.50 up to 32', () => expect(FareEngine.roundFare(31.5)).toBe(32));
  it('rounds 21.00 to 21', () => expect(FareEngine.roundFare(21)).toBe(21));
  it('rounds 37.80 up to 38', () => expect(FareEngine.roundFare(37.8)).toBe(38));
});

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────
describe('validateFareSubmission', () => {
  it('rejects when stageFrom >= stageTo', () => {
    const errors = validateFareSubmission({
      stageFrom: 3,
      stageTo: 2,
      baseFare: 100,
      busCategory: BusCategory.ORDINARY,
      ntcLimits: [],
      existingRules: [],
    });
    expect(errors.some((e) => e.includes('stage_from must be less than'))).toBe(true);
  });

  it('rejects zero fare', () => {
    const errors = validateFareSubmission({
      stageFrom: 1,
      stageTo: 2,
      baseFare: 0,
      busCategory: BusCategory.ORDINARY,
      ntcLimits: [],
      existingRules: [],
    });
    expect(errors.some((e) => e.includes('greater than zero'))).toBe(true);
  });

  it('rejects non-monotonic fare', () => {
    const errors = validateFareSubmission({
      stageFrom: 1,
      stageTo: 4,
      baseFare: 20,
      busCategory: BusCategory.ORDINARY,
      ntcLimits: [],
      existingRules: [{ stageFrom: 1, stageTo: 3, baseFare: 28 }],
    });
    expect(errors.some((e) => e.includes('must be ≥ fare for Stage'))).toBe(true);
  });
});
