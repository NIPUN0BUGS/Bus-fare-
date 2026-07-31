import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationService } from './notification.service';
import { SmsProcessor } from './processors/sms.processor';
import { EmailProcessor } from './processors/email.processor';
import { PushProcessor } from './processors/push.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'notifications.push' },
      { name: 'notifications.sms' },
      { name: 'notifications.email' },
    ),
  ],
  providers: [NotificationService, SmsProcessor, EmailProcessor, PushProcessor],
  exports: [NotificationService],
})
export class NotificationModule {}
