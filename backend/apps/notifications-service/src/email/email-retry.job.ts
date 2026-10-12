import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailLogService } from './email-log.service.js';

/** Reintenta cada 10 minutos los emails que el proveedor rechazó o no respondió. */
@Injectable()
export class EmailRetryJob {
  private readonly logger = new Logger(EmailRetryJob.name);
  private running = false;

  constructor(private readonly emails: EmailLogService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const count = await this.emails.retryFailed();
      if (count) this.logger.log(`${count} email(s) reintentados`);
    } catch (err) {
      this.logger.error(`Error al reintentar emails: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
