import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from './auth.models';
import { SessionService } from './session.service';
import { RegisterGuardianRequest } from './auth.models';
import { PasswordResetConfirmRequest, PasswordResetRequest, UserProfile } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, request)
      .pipe(tap((response) => this.session.start(response)));
  }

  logout(): void {
    this.session.end();
    void this.router.navigate(['/login']);
  }
  register(request: RegisterGuardianRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${environment.apiBaseUrl}/users/register`, request);
  }

  /** U13. El back siempre responde 202, exista o no el correo. */
  requestPasswordReset(request: PasswordResetRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/auth/password-reset/request`, request);
  }

  /** U14. Cambia la contraseña con el token del enlace (204 sin cuerpo). */
  confirmPasswordReset(request: PasswordResetConfirmRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/auth/password-reset/confirm`, request);
  }
}
