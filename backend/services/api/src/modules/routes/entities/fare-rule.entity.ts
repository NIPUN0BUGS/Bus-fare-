import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { BusCategory, FareSourceType, PassengerType } from '@buslanka/shared-types';

@Entity('fare_rules')
export class FareRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string;

  @Column({ name: 'operator_id', type: 'uuid' })
  operatorId: string;

  @Column({ name: 'bus_category', type: 'enum', enum: BusCategory })
  busCategory: BusCategory;

  @Column({ name: 'stage_from', type: 'smallint' })
  stageFrom: number;

  @Column({ name: 'stage_to', type: 'smallint' })
  stageTo: number;

  @Column({ name: 'passenger_type', type: 'enum', enum: PassengerType })
  passengerType: PassengerType;

  @Column({ name: 'base_fare', type: 'numeric', precision: 10, scale: 2 })
  baseFare: number;

  @Column({ type: 'char', length: 3, default: 'LKR' })
  currency: string;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo: Date | null;

  @Column({ name: 'source_type', type: 'enum', enum: FareSourceType, default: FareSourceType.OPERATOR })
  sourceType: FareSourceType;

  @Column({ name: 'ntc_revision_id', type: 'uuid', nullable: true })
  ntcRevisionId: string | null;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
