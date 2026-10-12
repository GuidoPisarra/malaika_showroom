import { BROKER, rpc } from '@malaika/common';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class Broker {
  constructor(@Inject(BROKER) private readonly client: ClientProxy) {}

  send<T = unknown>(pattern: string, data: unknown): Promise<T> {
    return rpc<T>(this.client, pattern, data);
  }
}
