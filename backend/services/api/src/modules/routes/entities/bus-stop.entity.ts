import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';
import { StopStatus } from '@buslanka/shared-types';

@Entity('bus_stops')
export class BusStopEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stop_code', type: 'varchar', length: 20, unique: true, nullable: true })
  stopCode: string | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'name_si', type: 'varchar', length: 200, nullable: true })
  nameSi: string | null;

  @Column({ name: 'name_ta', type: 'varchar', length: 200, nullable: true })
  nameTa: string | null;

  @Column({ name: 'district_id', type: 'smallint', nullable: true })
  districtId: number | null;

  @Column({ type: 'double precision' })
  lat: number;

  @Column({ type: 'double precision' })
  lng: number;

  @Column({ name: 'address_text', type: 'text', nullable: true })
  addressText: string | null;

  @Column({ name: 'is_terminus', default: false })
  isTerminus: boolean;

  @Column({ name: 'has_shelter', default: false })
  hasShelter: boolean;

  @Column({ name: 'wheelchair_accessible', default: false })
  wheelchairAccessible: boolean;

  @Column({ type: 'enum', enum: StopStatus, default: StopStatus.ACTIVE })
  status: StopStatus;

  @Column({ name: 'added_by_operator_id', type: 'uuid', nullable: true })
  addedByOperatorId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;
}
