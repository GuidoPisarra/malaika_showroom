import 'reflect-metadata';
import { bootstrapMicroservice, requireEnv } from '@malaika/common';
import { AppModule } from './app.module.js';

requireEnv('CATALOG_DATABASE_URL');
await bootstrapMicroservice(AppModule, 'catalog_queue');
