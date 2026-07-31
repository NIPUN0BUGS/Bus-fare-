import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { BusCategory, RouteStatus } from '@buslanka/shared-types';
import { OperatorEntity } from '../../operator/entities/operator.entity';

@Entity('routes')
export class RouteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => OperatorEntity)
  @JoinColumn({ name: 'operator_id' })
  operator: OperatorEntity;

  @Column({ name: 'operator_id', type: 'uuid' })
  operatorId: string;

  @Column({ name: 'route_number', type: 'varchar', length: 20 })
  routeNumber: string;

  @Column({ type: 'varchar', length: 300 })
  name: string;

  @Column({ name: 'name_si', type: 'varchar', length: 300, nullable: true })
  nameSi: string | null;

  @Column({ name: 'name_ta', type: 'varchar', length: 300, nullable: true })
  nameTa: string | null;

  @Column({ name: 'origin_stop_id', type: 'uuid' })
  originStopId: string;

  @Column({ name: 'dest_stop_id', type: 'uuid' })
  destStopId: string;

  @Column({ name: 'bus_category', type: 'enum', enum: BusCategory })
  busCategory: BusCategory;

  @Column({ name: 'district_from', type: 'smallint', nullable: true })
  districtFrom: number | null;

  @Column({ name: 'district_to', type: 'smallint', nullable: true })
  districtTo: number | null;

  @Column({ type: 'enum', enum: RouteStatus, default: RouteStatus.DRAFT })
  status: RouteStatus;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;
}
