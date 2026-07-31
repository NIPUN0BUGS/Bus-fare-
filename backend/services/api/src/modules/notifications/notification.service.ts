import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('notifications.push')
    private pushQueue: Queue,
    @InjectQueue('notifications.sms')
    private smsQueue: Queue,
    @InjectQueue('notifications.email')
    private emailQueue: Queue,
  ) {}

  async sendPush(userId: string, title: string, body: string, data?: Record<string, unknown>) {
    await this.pushQueue.add('send', { userId, title, body, data });
  }

  async sendSms(phone: string, message: string) {
    await this.smsQueue.add('send', { phone, message });
  }

  async sendEmail(to: string, subject: string, html: string) {
    await this.emailQueue.add('send', { to, subject, html });
  }
}
