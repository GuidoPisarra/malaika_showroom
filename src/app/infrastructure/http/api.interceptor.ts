import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthSessionService } from '../auth/auth-session.service';
import { API_BASE_URL } from './api.config';

const withToken = (req: HttpRequest<unknown>, token: string | undefined) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

/** Agrega el JWT a los requests de la API y renueva la sesión si venció. */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(API_BASE_URL);
  if (!req.url.startsWith(api)) return next(req);

  const auth = inject(AuthSessionService);
  const isAuthCall = req.url.startsWith(`${api}/auth/`);

  return next(withToken(req, auth.session()?.accessToken)).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || isAuthCall || !auth.session()) {
        return throwError(() => err);
      }
      return auth.refresh().pipe(switchMap((s) => next(withToken(req, s.accessToken))));
    }),
  );
};
