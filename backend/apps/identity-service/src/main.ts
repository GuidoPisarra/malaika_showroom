import 'reflect-metadata';
import { bootstrapMicroservice, requireEnv } from '@malaika/common';
import { AppModule } from './app.module.js';

requireEnv('IDENTITY_DATABASE_URL', 'JWT_SECRET');
await bootstrapMicroservice(AppModule, 'identity_queue');
