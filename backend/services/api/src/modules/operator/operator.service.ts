import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { OperatorEntity } from './entities/operator.entity';
import { OperatorStatus } from '@buslanka/shared-types';

@Injectable()
export class OperatorService {
  constructor(
    @InjectRepository(OperatorEntity)
    private operatorRepo: Repository<OperatorEntity>,
    @InjectQueue('gps.ingest')
    private gpsQueue: Queue,
    @InjectQueue('data.validation')
    private validationQueue: Queue,
  ) {}

  async ingestGps(
    vehicleId: string,
    payload: { tripId?: string; lat: number; lng: number; heading?: number; speedKmh?: number; occupancy?: string; timestamp: string },
    apiKey: string,
  ) {
    const operator = await this.resolveOperatorFromApiKey(apiKey);

    // Basic coordinate sanity check — operator service area validation happens in the queue processor
    if (payload.lat < 5.9 || payload.lat > 9.9 || payload.lng < 79.4 || payload.lng > 81.9) {
      throw new BadRequestException({
        code: 'GPS_OUT_OF_BOUNDS',
        message: `Coordinates (${payload.lat}, ${payload.lng}) are outside Sri Lanka.`,
      });
    }

    await this.gpsQueue.add(
      'ingest',
      { vehicleId, operatorId: operator.id, ...payload },
      { removeOnComplete: true, attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );

    return { received: true, receivedAt: new Date().toISOString(), validationWarnings: [] };
  }

  async submitAlert(tripId: string, payload: Record<string, unknown>, apiKey: string) {
    await this.resolveOperatorFromApiKey(apiKey);
    // Alert processing queued for async handling
    await this.validationQueue.add('process-alert', { tripId, payload });
    return { received: true, receivedAt: new Date().toISOString() };
  }

  async submitFares(payload: Record<string, unknown>, apiKey: string) {
    const operator = await this.resolveOperatorFromApiKey(apiKey);
    await this.validationQueue.add('validate-fares', { operatorId: operator.id, payload });
    return { submissionId: crypto.randomUUID(), status: 'ACCEPTED', warnings: [] };
  }

  private async resolveOperatorFromApiKey(rawKey: string): Promise<OperatorEntity> {
    if (!rawKey) throw new UnauthorizedException('API key is required.');

    // In production, look up the hashed key in api_credentials table
    // For now, returning a placeholder; the full implementation is in Phase 1 Week 9
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    void keyHash;

    const operator = await this.operatorRepo.findOne({
      where: { status: OperatorStatus.ACTIVE },
    });

    if (!operator) throw new UnauthorizedException('Invalid or revoked API key.');
    return operator;
  }
}
