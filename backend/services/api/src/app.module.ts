import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from './modules/auth/auth.module';
import { RouteModule } from './modules/routes/route.module';
import { SearchModule } from './modules/search/search.module';
import { FareModule } from './modules/fares/fare.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { BookingModule } from './modules/bookings/booking.module';
import { OperatorModule } from './modules/operator/operator.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { HealthModule } from './modules/health/health.module';
import { dataSourceOptions } from './database/data-source';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => dataSourceOptions,
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),

    ScheduleModule.forRoot(),
    TerminusModule,

    AuthModule,
    RouteModule,
    SearchModule,
    FareModule,
    TrackingModule,
    BookingModule,
    OperatorModule,
    AdminModule,
    NotificationModule,
    HealthModule,
  ],
})
export class AppModule {}
