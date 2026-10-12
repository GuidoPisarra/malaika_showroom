import { Logger } from '@nestjs/common';
import { emailDriver } from './email-provider.js';
import type { EmailProvider } from './email-provider.js';
import { LogProvider } from './log.provider.js';
import { ResendProvider } from './resend.provider.js';
import { SmtpProvider } from './smtp.provider.js';

export function createEmailProvider(): EmailProvider {
  const driver = emailDriver();
  const logger = new Logger('Emails');
  switch (driver) {
    case 'resend':
      logger.log('Emails por Resend');
      return new ResendProvider(process.env.RESEND_API_KEY!, process.env.RESEND_API_URL || undefined);
    case 'smtp':
      logger.log('Emails por SMTP');
      return new SmtpProvider(process.env.SMTP_URL!);
    default:
      logger.warn('EMAIL_DRIVER=log: los emails no se envían, se guardan en EMAIL_OUTBOX_DIR');
      return new LogProvider();
  }
}
