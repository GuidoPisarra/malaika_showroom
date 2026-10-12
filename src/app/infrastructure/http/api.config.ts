import { HttpErrorResponse } from '@angular/common/http';
import { InjectionToken } from '@angular/core';

/**
 * URL base de la API. En el navegador es relativa ('/api'): en desarrollo la
 * resuelve el proxy de `ng serve` y en producción el nginx del VPS. En el
 * render del servidor (SSR) se reemplaza por una URL absoluta.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});

/** Mensaje legible de un error de la API ({ statusCode, message } o validaciones). */
export function apiErrorMessage(err: unknown, fallback = 'Ocurrió un error, intentá de nuevo.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No pudimos conectar con la tienda. Revisá tu conexión.';
    const message = (err.error as { message?: unknown } | null)?.message;
    if (Array.isArray(message) && message.length) return String(message[0]).replace(/^[\w.]+\./, '');
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}
