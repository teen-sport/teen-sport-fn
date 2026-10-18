import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from './auth.models';
import { SessionService } from './session.service';
import { RegisterGuardianRequest } from './auth.models';
import { UserProfile } from './auth.models';


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
}
