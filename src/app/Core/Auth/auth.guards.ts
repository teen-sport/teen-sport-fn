import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../Models/role';
import { homeRouteFor } from './role-home';
import { SessionService } from './session.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);
  return session.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  const role = session.role();
  return session.isAuthenticated() && role ? router.createUrlTree([homeRouteFor(role)]) : true;
};

export function roleGuard(...allowed: Role[]): CanActivateFn {
  return () => {
    const session = inject(SessionService);
    const router = inject(Router);
    if (session.hasRole(...allowed)) {
      return true;
    }
    const role = session.role();
    return router.createUrlTree([
      role && session.isAuthenticated() ? homeRouteFor(role) : '/login',
    ]);
  };
}
