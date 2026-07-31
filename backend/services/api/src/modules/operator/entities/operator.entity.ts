import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn,
} from 'typeorm';
import { OperatorStatus } from '@buslanka/shared-types';

@Entity('operators')
export class OperatorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'name_si', type: 'varchar', length: 200, nullable: true })
  nameSi: string | null;

  @Column({ name: 'name_ta', type: 'varchar', length: 200, nullable: true })
  nameTa: string | null;

  @Column({ name: 'ntc_licence_number', type: 'varchar', length: 50, unique: true, nullable: true })
  ntcLicenceNumber: string | null;

  @Column({ name: 'registration_number', type: 'varchar', length: 50, nullable: true })
  registrationNumber: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 320 })
  contactEmail: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20, nullable: true })
  contactPhone: string | null;

  @Column({ name: 'address_text', type: 'text', nullable: true })
  addressText: string | null;

  @Column({ type: 'enum', enum: OperatorStatus, default: OperatorStatus.PENDING })
  status: OperatorStatus;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;
}
