import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { BusStopEntity } from './entities/bus-stop.entity';
import { RouteEntity } from './entities/route.entity';
import { FareRuleEntity } from './entities/fare-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BusStopEntity, RouteEntity, FareRuleEntity])],
  controllers: [RouteController],
  providers: [RouteService],
  exports: [RouteService, TypeOrmModule],
})
export class RouteModule {}
