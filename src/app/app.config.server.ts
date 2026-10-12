import { HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, REQUEST, inject, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { API_BASE_URL } from './infrastructure/http/api.config';
import { apiInterceptor } from './infrastructure/http/api.interceptor';
import { serverRoutes } from './app.routes.server';

/**
 * En el SSR la API se llama directo (sin pasar por nginx), así que reenviamos
 * el dominio original para que el gateway sepa de qué comercio es la tienda.
 */
const forwardHostInterceptor: HttpInterceptorFn = (req, next) => {
  const host = inject(REQUEST, { optional: true })?.headers.get('host');
  return next(host ? req.clone({ setHeaders: { 'X-Forwarded-Host': host } }) : req);
};

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: API_BASE_URL, useValue: process.env['API_URL'] || 'http://localhost:3100/api' },
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor, forwardHostInterceptor])),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
