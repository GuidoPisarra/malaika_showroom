import { MessagingModule } from '@malaika/common';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailLogService } from './email/email-log.service.js';
import { EmailRetryJob } from './email/email-retry.job.js';
import { NotificationsService } from './email/notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { PrismaService } from './prisma/prisma.service.js';
import { EMAIL_PROVIDER } from './providers/email-provider.js';
import { createEmailProvider } from './providers/provider.factory.js';

@Module({
  imports: [MessagingModule.register(), ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [
    PrismaService,
    { provide: EMAIL_PROVIDER, useFactory: createEmailProvider },
    EmailLogService,
    NotificationsService,
    EmailRetryJob,
  ],
})
export class AppModule {}
