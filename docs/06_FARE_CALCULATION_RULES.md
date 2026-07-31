# BusLanka — Fare Calculation Rules

**Version:** 1.0  
**Date:** 2026-07-30  
**Scope:** Server-side fare engine (never client-side)

---

## 1. Principles

1. **No invented fares.** If a fare is not in the database from a verified source, return `UNAVAILABLE`. Never display 0, null, or a guess as a fare.
2. **Source transparency.** Every fare result must include: source type, source name, effective date, and last updated timestamp.
3. **NTC supremacy.** NTC-published revisions override operator-submitted fares for the same route, category, stage, and passenger type.
4. **Stage-first pricing.** Sri Lankan bus fares are stage-based, not purely distance-based. The fare stage a stop belongs to determines the fare, not the kilometre count.
5. **Passenger-type multipliers are route-specific.** Some operators and categories have different child/student ratios; use operator-configured values when present, fall back to NTC defaults.
6. **Time-aware.** Apply the fare rule whose `effective_from` ≤ travel date and `effective_to` IS NULL or > travel date.
7. **Promotions are additive reductions.** They reduce the base fare but cannot reduce the fare below the NTC minimum.

---

## 2. Fare Resolution Algorithm

```
function resolveFare(routeId, fromStopId, toStopId, passengerType, busCategory, travelDate):

  1. DETERMINE FARE STAGES
     stageFrom = getStageForStop(routeId, fromStopId)
     stageTo   = getStageForStop(routeId, toStopId)
     if stageFrom IS NULL OR stageTo IS NULL:
       return FareResult { status: UNAVAILABLE, reason: "Stop not mapped to a fare stage" }

  2. NORMALISE STAGE DIRECTION
     if stageFrom > stageTo:
       swap(stageFrom, stageTo)   # fare is the same in both directions

  3. QUERY FARE RULES (priority order)
     rule = queryFareRules(
       routeId, busCategory, stageFrom, stageTo, passengerType,
       travelDate,
       priority: [NTC_OFFICIAL, OPERATOR, ESTIMATED]
     )
     if rule IS NULL:
       return FareResult { status: UNAVAILABLE }

  4. APPLY BASE FARE
     baseFare = rule.base_fare

  5. APPLY ACTIVE PROMOTIONS
     promotions = getActivePromotions(routeId, busCategory, passengerType, travelDate)
     for each promotion:
       discount = calculateDiscount(promotion, baseFare)
       baseFare = max(baseFare - discount, NTC_MINIMUM_FARE)
     totalDiscount = original baseFare - baseFare

  6. RETURN FARE RESULT
     return FareResult {
       amount: baseFare,
       currency: "LKR",
       status: rule.source_type,             # CONFIRMED | ESTIMATED
       source: { type, name, revisionCode, effectiveFrom },
       passengerType,
       stageFrom,
       stageTo,
       discountApplied: totalDiscount,
       updatedAt: rule.updated_at
     }
```

---

## 3. Fare Stage Lookup

Each stop on a route is assigned a `fare_stage_number` in the `route_stops` table.

```sql
SELECT rs.fare_stage_number
FROM route_stops rs
WHERE rs.route_id = $routeId
  AND rs.stop_id  = $stopId
  AND rs.direction = 0   -- use canonical direction; fare is bidirectional
LIMIT 1;
```

If a stop appears on the route in multiple directions, the `fare_stage_number` must be consistent (stops belong to the same stage in both directions).

---

## 4. Passenger Type Multipliers

When an operator has not submitted explicit per-passenger-type fares, apply these NTC default multipliers to the adult fare:

| Passenger Type | Default Multiplier | Notes |
|---------------|-------------------|-------|
| ADULT | 1.00 | Base |
| CHILD (under 12) | 0.50 | Half adult fare, rounded up to nearest 50 cents |
| STUDENT (with card) | 0.75 | Three-quarters adult fare |
| SENIOR (60+) | 0.75 | Three-quarters adult fare |
| CONCESSION | 0.50 | Operator/scheme specific; flag if not configured |

**Rounding rule:** Round to the nearest whole rupee (0.50 rounds up). Never truncate.

```
childFare = ceil(adultFare * 0.50)
```

---

## 5. Bus Category Fare Rules

Different bus categories operate under different NTC fare schedules. The same route number may have both ordinary and semi-luxury services with different fares.

| Bus Category | Pricing Basis | Notes |
|-------------|--------------|-------|
| ORDINARY | NTC stage fare | Subsidised; NTC maximum applies strictly |
| SEMI_LUXURY | NTC semi-luxury schedule | Higher than ordinary; NTC max applies |
| LUXURY | NTC luxury schedule | |
| EXPRESSWAY | Expressway-specific NTC rates | Distance band may supplement stages |
| AC | AC surcharge on base category | |
| SCHOOL | Contract-based; fare not publicly displayed | |
| SPECIAL | Operator-set within NTC ceiling | |
| EXPRESS | Express surcharge on ordinary rate | |

For AC buses that are also ordinary or semi-luxury, apply the AC surcharge on top of the category base fare.

---

## 6. Multi-Leg Journey Fare Calculation

For journeys requiring one or more transfers:

```
totalFare = 0
for each leg in journey.legs:
  legFare = resolveFare(leg.routeId, leg.fromStopId, leg.toStopId,
                         passengerType, leg.busCategory, travelDate)
  if legFare.status == UNAVAILABLE:
    legFare.amount = 0  # show per-leg unavailable, do not sum
    totalFare.hasUnavailableLeg = true
  else:
    totalFare.amount += legFare.amount
  totalFare.legs.append(legFare)

if totalFare.hasUnavailableLeg:
  totalFare.status = PARTIAL  # show partial total with warning
else:
  totalFare.status = CONFIRMED (or ESTIMATED if any leg is estimated)
```

Display rule: "Total fare shown is for legs where fare data is available. Leg 2 fare is unavailable — please confirm with the conductor."

---

## 7. Fare Versioning and Effective Dates

Fares are time-versioned. When querying for a travel date:

```sql
SELECT *
FROM fare_rules
WHERE route_id       = $routeId
  AND bus_category   = $busCategory
  AND stage_from     = $stageFrom
  AND stage_to       = $stageTo
  AND passenger_type = $passengerType
  AND effective_from <= $travelDate
  AND (effective_to IS NULL OR effective_to > $travelDate)
ORDER BY
  -- NTC official takes priority over operator
  CASE source_type WHEN 'NTC_OFFICIAL' THEN 1 WHEN 'OPERATOR' THEN 2 ELSE 3 END,
  effective_from DESC
LIMIT 1;
```

---

## 8. Estimated Fares

When no operator or NTC fare rule exists for a route but route geometry is available:

1. Calculate route distance between the two stops (PostGIS `ST_Length`).
2. Look up the **NTC distance-band table** for the bus category (loaded from `system_config`).
3. Apply the passenger type multiplier.
4. Return with `status: ESTIMATED` and a clear disclaimer.

**Distance-band table example (Ordinary bus, NTC 2026):**

| Distance Band (km) | Adult Fare (LKR) |
|-------------------|-----------------|
| 0–5 | 18.00 |
| 5–10 | 24.00 |
| 10–20 | 36.00 |
| 20–35 | 52.00 |
| 35–60 | 78.00 |
| 60–100 | 115.00 |
| 100+ | 150.00 |

*These bands must be configurable by a platform admin when NTC revises them. They must NOT be hardcoded.*

---

## 9. Promotions

Promotions are stored in a `promotions` table (to be created in Phase 3) and evaluated during fare resolution:

| Field | Description |
|-------|-------------|
| `promotion_code` | Unique code |
| `discount_type` | `PERCENTAGE` or `FIXED_AMOUNT` |
| `discount_value` | Amount of discount |
| `min_fare` | Minimum fare the discount applies to |
| `eligible_passenger_types` | Array |
| `eligible_bus_categories` | Array |
| `eligible_route_ids` | NULL = all routes |
| `valid_from` | Start date |
| `valid_to` | End date |
| `max_uses` | Per promotion total cap |
| `max_uses_per_user` | Per user cap |

**Promotion application:**
```
discountAmount = 0
if discount_type == PERCENTAGE:
  discountAmount = baseFare * (discount_value / 100)
else:
  discountAmount = discount_value

discountedFare = max(baseFare - discountAmount, NTC_MINIMUM_FARE_FOR_CATEGORY)
```

---

## 10. Fare Validation Rules

The system must reject or flag fare submissions that fail these checks:

| Check | Rule | Action on Fail |
|-------|------|---------------|
| Stage ordering | `stage_from` must be < `stage_to` | Reject |
| Positive fare | `base_fare` must be > 0 | Reject |
| NTC ceiling | `base_fare` ≤ NTC maximum for bus category and route distance | Reject |
| NTC floor | `base_fare` ≥ NTC minimum for bus category | Reject |
| Currency | Must be `LKR` | Reject |
| Effective date | `effective_from` must not be in the past by more than 7 days | Warn |
| All passenger types | If adult fare provided, check child/student/senior provided too | Warn if missing |
| Duplicate | Exact duplicate of an active fare rule | Reject |
| Monotonic increase | Fare for Stage 1→4 must be ≥ Stage 1→3 ≥ Stage 1→2 | Reject |

---

## 11. Fare Cache Strategy

To avoid querying the database on every journey search:

1. Resolved fares are cached in Redis with key:  
   `fare:{routeId}:{stageFrom}:{stageTo}:{passengerType}:{busCategory}:{travelDateISO}`  
   TTL: 30 minutes.

2. Cache is invalidated when:
   - A new fare rule is submitted for the route
   - An NTC revision is published affecting the route
   - Admin manually triggers cache clear

3. All cached results include `updatedAt` so the UI can show "Last updated: 30 minutes ago".

---

## 12. Test Cases

### TC-01: Standard adult ordinary fare

Input: Route 177, Stage 1→4, ADULT, ORDINARY, 2026-07-30  
Expected: LKR 42.00, status CONFIRMED, source NTC_OFFICIAL

### TC-02: Child ordinary fare (50% of adult)

Input: Route 177, Stage 1→4, CHILD, ORDINARY, 2026-07-30  
Expected: LKR 21.00 (ceil(42.00 × 0.50)), status CONFIRMED

### TC-03: Fare unavailable

Input: Route 888 (no fare rules exist), Stage 1→3, ADULT, ORDINARY, 2026-07-30  
Expected: status UNAVAILABLE, amount null

### TC-04: Estimated fare (distance fallback)

Input: Route 555 (no explicit stage fares), distance calculated as 22 km, ADULT, ORDINARY  
Expected: LKR 52.00, status ESTIMATED, disclaimer shown

### TC-05: Future-dated NTC revision

Input: Route 177, ADULT, ORDINARY, travel date 2026-08-15, new NTC revision effective 2026-08-01 sets fare to LKR 46.00  
Expected: LKR 46.00 for travel on 2026-08-15; LKR 42.00 for travel before 2026-08-01

### TC-06: Operator fare override by NTC

Input: Operator submits LKR 45.00 for Route 177 Stage 1→4; NTC submits LKR 42.00 for same.  
Expected: LKR 42.00 (NTC_OFFICIAL takes priority over OPERATOR)

### TC-07: Fare exceeds NTC ceiling rejected

Input: Operator submits LKR 600.00 for Expressway AC Stage 1→4 where NTC ceiling is LKR 450.00  
Expected: Submission rejected with error `FARE_EXCEEDS_NTC_MAXIMUM`

### TC-08: Multi-leg fare with one unavailable leg

Input: Leg 1 = Route 177 LKR 42.00 CONFIRMED; Leg 2 = Route 888 UNAVAILABLE  
Expected: Partial total shown as LKR 42.00, with warning "Leg 2 fare unavailable"

### TC-09: Promotion applied

Input: Route 177, ADULT, ORDINARY, active promotion 10% off, base LKR 42.00  
Expected: LKR 37.80 → rounded to LKR 38.00, discount LKR 4.00, source OPERATOR_PROMOTION

### TC-10: Stage in opposite direction (inbound)

Input: Route 177 direction 1 (Fort→Nugegoda), Stage 4→1, ADULT, ORDINARY  
Expected: Same LKR 42.00 as outbound (normalised to Stage 1→4)

### TC-11: Student without stage fare — fallback to multiplier

Input: Route 177, Stage 1→4, STUDENT, ORDINARY; operator has not submitted student fare  
Expected: LKR 32.00 (ceil(42.00 × 0.75) = 31.50 → 32.00), status CONFIRMED with note "Student fare derived from adult fare"

### TC-12: Concession — not configured

Input: Route 177, Stage 1→4, CONCESSION, ORDINARY; no concession fare configured  
Expected: status UNAVAILABLE, message "Concession fares are not configured for this route. Please confirm eligibility with the conductor."
