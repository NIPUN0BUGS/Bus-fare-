import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import * as https from 'node:https';
import * as fs from 'node:fs';

interface PushJob {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Processor('notifications.push')
export class PushProcessor {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(private readonly config: ConfigService) {}

  @Process('send')
  async handleSend(job: Job<PushJob>) {
    const { userId, title, body, data } = job.data;

    const fcmKeyPath = this.config.get<string>('FCM_PRIVATE_KEY_PATH');
    if (!fcmKeyPath || !fs.existsSync(fcmKeyPath)) {
      this.logger.warn(`FCM key not configured — skipping push for user ${userId}`);
      return;
    }

    // FCM token lookup would happen here (from device_tokens table).
    // Phase 2 will implement the full fan-out with a DeviceTokenService.
    // For now, we log the intent and do nothing if no token is resolved.
    this.logger.debug(`Push queued for user ${userId}: "${title}"`);

    try {
      await this.sendFcm({ title, body, data: data ?? {} });
    } catch (err) {
      this.logger.error(`FCM push failed for user ${userId}: ${(err as Error).message}`);
      throw err;
    }
  }

  private sendFcm(payload: { title: string; body: string; data: Record<string, unknown> }): Promise<void> {
    const projectId = this.config.getOrThrow<string>('FCM_PROJECT_ID');
    const message = JSON.stringify({
      message: {
        // token would be the device FCM token — resolved from device_tokens in Phase 2
        notification: { title: payload.title, body: payload.body },
        data: Object.fromEntries(
          Object.entries(payload.data).map(([k, v]) => [k, String(v)]),
        ),
        android: { priority: 'HIGH' },
        apns: { headers: { 'apns-priority': '10' } },
      },
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'fcm.googleapis.com',
          path: `/v1/projects/${projectId}/messages:send`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(message),
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`FCM responded with HTTP ${res.statusCode}`));
          } else {
            res.resume();
            resolve();
          }
        },
      );
      req.on('error', reject);
      req.write(message);
      req.end();
    });
  }
}
