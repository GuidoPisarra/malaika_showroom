import { DynamicModule, Global, Inject, Module } from '@nestjs/common';
import { ClientProxy, ClientsModule, RmqOptions, Transport } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

export const BROKER = 'MALAIKA_BROKER';
export const InjectBroker = () => Inject(BROKER);

/** Exchange topic por el que viajan todos los mensajes. */
export const EXCHANGE = 'malaika';

function rabbitUrl(): string {
  return process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
}

/**
 * Opciones del servidor RMQ de un microservicio. La cola queda enlazada al
 * exchange con cada patrón que el servicio maneja (`wildcards: true`).
 */
export function microserviceOptions(queue: string): RmqOptions {
  return {
    transport: Transport.RMQ,
    options: {
      urls: [rabbitUrl()],
      queue,
      exchange: EXCHANGE,
      exchangeType: 'topic',
      wildcards: true,
      queueOptions: { durable: true },
      prefetchCount: 20,
    },
  };
}

/** Cliente para publicar mensajes y eventos en el exchange. */
@Global()
@Module({})
export class MessagingModule {
  static register(): DynamicModule {
    const clients = ClientsModule.register([
      {
        name: BROKER,
        transport: Transport.RMQ,
        options: {
          urls: [rabbitUrl()],
          exchange: EXCHANGE,
          exchangeType: 'topic',
          wildcards: true,
          queue: EXCHANGE,
          persistent: true,
        },
      },
    ]);
    return { module: MessagingModule, imports: [clients], exports: [clients] };
  }
}

const RPC_TIMEOUT_MS = Number(process.env.RPC_TIMEOUT_MS ?? 10_000);

/** Envía un request/response y espera la respuesta como promesa. */
export function rpc<T>(client: ClientProxy, pattern: string, data: unknown): Promise<T> {
  return firstValueFrom(client.send<T>(pattern, data ?? {}).pipe(timeout(RPC_TIMEOUT_MS)));
}

/** Publica un evento de dominio sin esperar respuesta. */
export function publish(client: ClientProxy, pattern: string, data: unknown): Promise<unknown> {
  return firstValueFrom(client.emit(pattern, data), { defaultValue: undefined });
}
