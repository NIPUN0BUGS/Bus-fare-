import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperatorStatus } from '@buslanka/shared-types';
import { OperatorEntity } from '../operator/entities/operator.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(OperatorEntity)
    private operatorRepo: Repository<OperatorEntity>,
  ) {}

  async listOperators(status?: string) {
    const qb = this.operatorRepo.createQueryBuilder('op');
    if (status) qb.where('op.status = :status', { status });
    return qb.orderBy('op.created_at', 'DESC').getMany();
  }

  async approveOperator(id: string, notes?: string) {
    const operator = await this.operatorRepo.findOne({ where: { id } });
    if (!operator) throw new NotFoundException(`Operator ${id} not found.`);
    operator.status = OperatorStatus.ACTIVE;
    operator.approvedAt = new Date();
    if (notes) operator.notes = notes;
    return this.operatorRepo.save(operator);
  }

  async suspendOperator(id: string, reason: string) {
    const operator = await this.operatorRepo.findOne({ where: { id } });
    if (!operator) throw new NotFoundException(`Operator ${id} not found.`);
    operator.status = OperatorStatus.SUSPENDED;
    operator.notes = reason;
    return this.operatorRepo.save(operator);
  }

  async gpsQualityReport() {
    return { operators: [] };
  }

  async auditLogs(params: { resource?: string; from?: string; to?: string; page: number; perPage: number }) {
    return { logs: [], total: 0, page: params.page, perPage: params.perPage };
  }
}
