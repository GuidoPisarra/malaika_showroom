import 'reflect-metadata';
import { bootstrapMicroservice, requireEnv } from '@malaika/common';
import { AppModule } from './app.module.js';

requireEnv('PAYMENTS_DATABASE_URL', 'ENCRYPTION_KEY');
await bootstrapMicroservice(AppModule, 'payments_queue');
