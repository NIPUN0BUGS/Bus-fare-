import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { RouteModule } from '../routes/route.module';
import { FareModule } from '../fares/fare.module';
import { BusStopEntity } from '../routes/entities/bus-stop.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BusStopEntity]), RouteModule, FareModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
