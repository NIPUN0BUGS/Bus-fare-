import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OperatorEntity } from '../operator/entities/operator.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OperatorEntity])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
