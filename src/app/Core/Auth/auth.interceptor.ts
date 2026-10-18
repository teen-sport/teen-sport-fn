import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from './session.service';

const PUBLIC_PATHS = ['/auth/login', '/users/register'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const baseUrl = environment.apiBaseUrl;

  const isApiRequest = request.url.startsWith(baseUrl);
  const isPublic = PUBLIC_PATHS.some((path) => request.url === `${baseUrl}${path}`);
  if (!isApiRequest || isPublic) {
    return next(request);
  }

  const token = session.token();
  const authorized = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const code = error.error?.code;
        if (code === 'TOKEN_EXPIRED' || code === 'UNAUTHENTICATED') {
          const returnUrl = router.url;
          session.end();
          void router.navigate(['/login'], {
            queryParams: { reason: code === 'TOKEN_EXPIRED' ? 'expired' : 'signin', returnUrl },
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
