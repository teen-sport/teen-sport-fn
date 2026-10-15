import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from '../../Core/Auth/session.service';
import { ChangePasswordRequest, MyProfile, UpdateProfileRequest } from './profile.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly url = `${environment.apiBaseUrl}/users/me`;

  /** U3: perfil de quien tiene la sesión abierta. */
  getMe(): Observable<MyProfile> {
    return this.http.get<MyProfile>(this.url);
  }

  /** U4: actualiza el perfil y refresca el nombre que muestra el encabezado. */
  update(request: UpdateProfileRequest): Observable<MyProfile> {
    return this.http.put<MyProfile>(this.url, request).pipe(
      tap((profile) =>
        this.session.updateUser({ firstNames: profile.firstNames, lastNames: profile.lastNames }),
      ),
    );
  }

  /** U5: cambia la contraseña. El servidor responde 204 sin cuerpo. */
  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.url}/password`, request);
  }
}
