import { isRpcErrorPayload } from '@malaika/common';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger, PayloadTooLargeException } from '@nestjs/common';
import type { Response } from 'express';
import { TimeoutError } from 'rxjs';

/** Traduce los errores de los microservicios (y los propios) a respuestas HTTP. */
@Catch()
export class RpcToHttpFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof PayloadTooLargeException) {
      res.status(413).json({ statusCode: 413, message: 'El archivo es demasiado grande', code: 'FILE_TOO_LARGE' });
      return;
    }
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      res.status(exception.getStatus()).json(typeof body === 'string' ? { statusCode: exception.getStatus(), message: body } : body);
      return;
    }
    if (isRpcErrorPayload(exception)) {
      res.status(exception.statusCode).json(exception);
      return;
    }
    if (exception instanceof TimeoutError) {
      res.status(504).json({ statusCode: 504, message: 'El servicio tardó demasiado en responder', code: 'TIMEOUT' });
      return;
    }
    this.logger.error(exception instanceof Error ? exception.stack : JSON.stringify(exception));
    res.status(500).json({ statusCode: 500, message: 'Error interno del servidor' });
  }
}
