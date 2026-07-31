import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { OperatorController } from './operator.controller';
import { OperatorService } from './operator.service';
import { OperatorEntity } from './entities/operator.entity';
import { GpsIngestProcessor } from './processors/gps-ingest.processor';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OperatorEntity]),
    BullModule.registerQueue(
      { name: 'gps.ingest' },
      { name: 'data.validation' },
    ),
    TrackingModule,
  ],
  controllers: [OperatorController],
  providers: [OperatorService, GpsIngestProcessor],
  exports: [OperatorService, TypeOrmModule],
})
export class OperatorModule {}
