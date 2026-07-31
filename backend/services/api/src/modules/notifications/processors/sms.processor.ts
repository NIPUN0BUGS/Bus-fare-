import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import * as https from 'node:https';
import * as querystring from 'node:querystring';

interface SmsJob {
  phone: string;
  message: string;
}

@Processor('notifications.sms')
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly config: ConfigService) {}

  @Process('send')
  async handleSend(job: Job<SmsJob>) {
    const { phone, message } = job.data;
    const provider = this.config.get<string>('SMS_PROVIDER', 'dialog');

    try {
      switch (provider) {
        case 'dialog':
          await this.sendViaDialog(phone, message);
          break;
        case 'mobitel':
          await this.sendViaMobitel(phone, message);
          break;
        case 'twilio':
          await this.sendViaTwilio(phone, message);
          break;
        default:
          this.logger.warn(`Unknown SMS provider "${provider}" — message not sent to ${phone}`);
      }
      this.logger.log(`SMS sent to ${phone.slice(0, 6)}*** via ${provider}`);
    } catch (err) {
      this.logger.error(`SMS delivery failed to ${phone.slice(0, 6)}***: ${(err as Error).message}`);
      throw err; // Bull will retry per queue backoff config
    }
  }

  private sendViaDialog(phone: string, message: string): Promise<void> {
    const apiKey = this.config.getOrThrow<string>('SMS_API_KEY');
    const from   = this.config.get<string>('SMS_FROM', 'BusLanka');

    const body = querystring.stringify({
      username: apiKey,
      to: phone,
      from,
      message,
    });

    return this.post('api.dialog.lk', '/sms/v1/messages', body);
  }

  private sendViaMobitel(phone: string, message: string): Promise<void> {
    const apiKey = this.config.getOrThrow<string>('SMS_API_KEY');
    const body = JSON.stringify({ to: phone, text: message, apiKey });
    return this.postJson('api.mobitel.lk', '/send', body);
  }

  private sendViaTwilio(phone: string, message: string): Promise<void> {
    const accountSid = this.config.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const authToken  = this.config.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    const from       = this.config.getOrThrow<string>('TWILIO_FROM');

    const body = querystring.stringify({ To: phone, From: from, Body: message });
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    return this.post(
      `api.twilio.com`,
      `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      body,
      { Authorization: `Basic ${auth}` },
    );
  }

  private post(
    hostname: string,
    path: string,
    body: string,
    extraHeaders: Record<string, string> = {},
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname,
          path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
            ...extraHeaders,
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`SMS API responded with HTTP ${res.statusCode}`));
          } else {
            res.resume();
            resolve();
          }
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  private postJson(hostname: string, path: string, body: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname,
          path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`SMS API responded with HTTP ${res.statusCode}`));
          } else {
            res.resume();
            resolve();
          }
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
