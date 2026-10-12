import 'reflect-metadata';
import { bootstrapMicroservice } from '@malaika/common';
import { AppModule } from './app.module.js';

await bootstrapMicroservice(AppModule, 'payments_queue');
