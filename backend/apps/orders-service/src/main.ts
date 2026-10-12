import 'reflect-metadata';
import { bootstrapMicroservice, requireEnv } from '@malaika/common';
import { AppModule } from './app.module.js';

requireEnv('ORDERS_DATABASE_URL');
await bootstrapMicroservice(AppModule, 'orders_queue');
