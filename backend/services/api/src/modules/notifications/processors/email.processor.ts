import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';

interface EmailJob {
  to: string;
  subject: string;
  html: string;
}

@Processor('notifications.email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.getOrThrow<string>('SMTP_HOST'),
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: this.config.getOrThrow<string>('SMTP_USER'),
          pass: this.config.getOrThrow<string>('SMTP_PASSWORD'),
        },
      });
    }
    return this.transporter;
  }

  @Process('send')
  async handleSend(job: Job<EmailJob>) {
    const { to, subject, html } = job.data;
    const from = this.config.get<string>('EMAIL_FROM', 'BusLanka <noreply@buslanka.lk>');

    try {
      await this.getTransporter().sendMail({ from, to, subject, html });
      this.logger.log(`Email "${subject}" delivered to ${to.split('@')[0]}@***`);
    } catch (err) {
      this.logger.error(`Email delivery failed to ${to.split('@')[0]}@***: ${(err as Error).message}`);
      throw err;
    }
  }
}
