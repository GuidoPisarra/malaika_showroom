import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../../infrastructure/auth/auth-session.service';

/** Solo admins del comercio (o superadmin) entran al panel. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthSessionService);
  return auth.isAdmin() ? true : inject(Router).createUrlTree(['/admin/login']);
};

/** Si ya hay sesión de admin, el login lleva directo al panel. */
export const adminLoginGuard: CanActivateFn = () => {
  const auth = inject(AuthSessionService);
  return auth.isAdmin() ? inject(Router).createUrlTree(['/admin']) : true;
};
