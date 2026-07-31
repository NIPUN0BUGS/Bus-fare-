import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FareController } from './fare.controller';
import { FareService } from './fare.service';
import { FareRuleEntity } from '../routes/entities/fare-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FareRuleEntity])],
  controllers: [FareController],
  providers: [FareService],
  exports: [FareService],
})
export class FareModule {}
