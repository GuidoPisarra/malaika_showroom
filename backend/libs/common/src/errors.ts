import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

/** Error que viaja por RabbitMQ y el gateway traduce a una respuesta HTTP. */
export interface RpcErrorPayload {
  statusCode: number;
  message: string;
  code?: string;
}

export function rpcError(statusCode: number, message: string, code?: string): RpcException {
  return new RpcException({ statusCode, message, code } satisfies RpcErrorPayload);
}

export const notFound = (what = 'Recurso') => rpcError(404, `${what} no encontrado`, 'NOT_FOUND');
export const badRequest = (message: string, code = 'BAD_REQUEST') => rpcError(400, message, code);
export const conflict = (message: string, code = 'CONFLICT') => rpcError(409, message, code);
export const unauthorized = (message = 'Credenciales inválidas') => rpcError(401, message, 'UNAUTHORIZED');
export const forbidden = (message = 'Acceso denegado') => rpcError(403, message, 'FORBIDDEN');

export function isRpcErrorPayload(value: unknown): value is RpcErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RpcErrorPayload).statusCode === 'number' &&
    typeof (value as RpcErrorPayload).message === 'string'
  );
}

/** Convierte cualquier error de un microservicio en un RpcErrorPayload serializable. */
@Catch()
export class RpcErrorsFilter implements ExceptionFilter {
  private readonly logger = new Logger('RpcErrorsFilter');

  catch(exception: unknown, _host: ArgumentsHost): Observable<never> {
    return throwError(() => this.toPayload(exception));
  }

  private toPayload(exception: unknown): RpcErrorPayload {
    // Error que vino de otro microservicio vía RPC: se propaga tal cual.
    if (isRpcErrorPayload(exception)) return exception;
    if (exception instanceof RpcException) {
      const error = exception.getError();
      if (isRpcErrorPayload(error)) return error;
      return { statusCode: 400, message: String(error) };
    }
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const message =
        typeof res === 'string' ? res : String((res as { message?: unknown }).message ?? exception.message);
      return { statusCode: exception.getStatus(), message };
    }
    const prismaCode = (exception as { code?: unknown })?.code;
    if (prismaCode === 'P2002') return { statusCode: 409, message: 'Ya existe un registro con esos datos', code: 'DUPLICATE' };
    if (prismaCode === 'P2025') return { statusCode: 404, message: 'Recurso no encontrado', code: 'NOT_FOUND' };

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return { statusCode: 500, message: 'Error interno del servidor' };
  }
}
