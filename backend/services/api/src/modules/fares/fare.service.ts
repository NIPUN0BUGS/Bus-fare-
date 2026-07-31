import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusCategory, FareSourceType, PassengerType } from '@buslanka/shared-types';
import { FareEngine } from '@buslanka/fare-engine';
import { FareRuleEntity } from '../routes/entities/fare-rule.entity';
import type { FareEngineContext, FareEngineResult } from '@buslanka/fare-engine';

interface CalculateFareInput {
  routeId: string;
  fromStopId: string;
  toStopId: string;
  passengerType: PassengerType;
  busCategory: BusCategory;
  travelDate: Date;
}

@Injectable()
export class FareService {
  constructor(
    @InjectRepository(FareRuleEntity)
    private fareRuleRepo: Repository<FareRuleEntity>,
  ) {}

  async calculateFare(input: CalculateFareInput): Promise<FareEngineResult> {
    const fareRules = await this.fareRuleRepo
      .createQueryBuilder('fr')
      .where('fr.route_id = :routeId', { routeId: input.routeId })
      .andWhere('fr.bus_category = :cat', { cat: input.busCategory })
      .andWhere('fr.effective_from <= :date', { date: input.travelDate })
      .andWhere('(fr.effective_to IS NULL OR fr.effective_to > :date)', { date: input.travelDate })
      .getMany();

    const routeStops = await this.fareRuleRepo.query(
      `SELECT rs.stop_id, rs.fare_stage_number, rs.distance_from_origin AS distance_from_origin_km
       FROM route_stops rs
       WHERE rs.route_id = $1 AND rs.direction = 0`,
      [input.routeId],
    ) as Array<{ stop_id: string; fare_stage_number: number | null; distance_from_origin_km: number | null }>;

    const context: FareEngineContext = {
      fareRules: fareRules.map((fr) => ({
        id: fr.id,
        routeId: fr.routeId,
        busCategory: fr.busCategory,
        stageFrom: fr.stageFrom,
        stageTo: fr.stageTo,
        passengerType: fr.passengerType,
        baseFare: Number(fr.baseFare),
        sourceType: fr.sourceType,
        sourceName: fr.sourceType === FareSourceType.NTC_OFFICIAL
          ? 'National Transport Commission'
          : 'Operator',
        revisionCode: fr.ntcRevisionId ?? null,
        effectiveFrom: fr.effectiveFrom,
        effectiveTo: fr.effectiveTo,
        updatedAt: fr.updatedAt,
      })),
      routeStops: routeStops.map((rs) => ({
        routeId: input.routeId,
        stopId: rs.stop_id,
        fareStageNumber: rs.fare_stage_number,
        distanceFromOriginKm: rs.distance_from_origin_km,
      })),
      distanceBands: this.getDefaultDistanceBands(),
      promotions: [],
      ntcLimits: this.getNtcLimits(),
    };

    const engine = new FareEngine(context);
    return engine.calculate({
      routeId: input.routeId,
      fromStopId: input.fromStopId,
      toStopId: input.toStopId,
      passengerType: input.passengerType,
      busCategory: input.busCategory,
      travelDate: input.travelDate,
    });
  }

  private getDefaultDistanceBands() {
    return [
      { minKm: 0, maxKm: 5, adultFare: 18 },
      { minKm: 5, maxKm: 10, adultFare: 24 },
      { minKm: 10, maxKm: 20, adultFare: 36 },
      { minKm: 20, maxKm: 35, adultFare: 52 },
      { minKm: 35, maxKm: 60, adultFare: 78 },
      { minKm: 60, maxKm: 100, adultFare: 115 },
      { minKm: 100, maxKm: 99999, adultFare: 150 },
    ];
  }

  private getNtcLimits() {
    return [
      { category: BusCategory.ORDINARY, minFare: 10, maxFare: null },
      { category: BusCategory.SEMI_LUXURY, minFare: 15, maxFare: null },
      { category: BusCategory.LUXURY, minFare: 20, maxFare: null },
      { category: BusCategory.EXPRESSWAY, minFare: 50, maxFare: 450 },
      { category: BusCategory.AC, minFare: 20, maxFare: null },
      { category: BusCategory.EXPRESS, minFare: 15, maxFare: null },
      { category: BusCategory.SPECIAL, minFare: 20, maxFare: null },
      { category: BusCategory.SCHOOL, minFare: 10, maxFare: null },
    ];
  }
}
