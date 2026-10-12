import { INestMicroservice, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { RpcErrorsFilter } from './errors.js';
import { microserviceOptions } from './messaging.js';

/** Arranca un microservicio escuchando su cola de RabbitMQ. */
export async function bootstrapMicroservice(module: unknown, queue: string): Promise<INestMicroservice> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    module as never,
    microserviceOptions(queue),
  );
  app.useGlobalFilters(new RpcErrorsFilter());
  app.enableShutdownHooks();
  await app.listen();
  new Logger('Bootstrap').log(`Microservicio escuchando la cola "${queue}"`);
  return app;
}
