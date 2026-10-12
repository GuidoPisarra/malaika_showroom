import 'reflect-metadata';
import { bootstrapMicroservice, requireEnv } from '@malaika/common';
import { AppModule } from './app.module.js';
import { emailRequiredEnv } from './providers/email-provider.js';

requireEnv('NOTIFICATIONS_DATABASE_URL', ...emailRequiredEnv());
await bootstrapMicroservice(AppModule, 'notifications_queue');
