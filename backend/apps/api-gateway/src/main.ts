import 'reflect-metadata';
import { requireEnv } from '@malaika/common';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { RpcToHttpFilter } from './core/rpc-to-http.filter.js';

requireEnv('JWT_SECRET');

const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.set('trust proxy', 1);
app.use(helmet());
app.enableCors({
  origin: (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
  credentials: true,
});
app.setGlobalPrefix('api');
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
app.useGlobalFilters(new RpcToHttpFilter());
app.enableShutdownHooks();

const port = Number(process.env.PORT ?? 3000);
await app.listen(port);
new Logger('Bootstrap').log(`API Gateway escuchando en http://localhost:${port}/api`);
