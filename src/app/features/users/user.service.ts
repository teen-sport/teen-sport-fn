import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../Core/Models/page';
import { EntityStatus } from '../../Core/Models/role';
import { AppUser, CreateAdminRequest, UpdateAdminRequest, UserQuery } from './user.models';

/** Administración de cuentas de cualquier rol: solo la usa el ADMIN (U6 a U10). */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly users = `${environment.apiBaseUrl}/users`;

  /** U6: listado paginado de usuarios, con filtros opcionales por rol, estado y texto. */
  list(query: UserQuery = {}): Observable<Page<AppUser>> {
    let params = new HttpParams();
    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query.size !== undefined) {
      params = params.set('size', query.size);
    }
    if (query.role) {
      params = params.set('role', query.role);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    const text = query.q?.trim();
    if (text) {
      params = params.set('q', text);
    }
    return this.http.get<Page<AppUser>>(this.users, { params });
  }

  /** U7: una cuenta por su id. */
  get(userId: number): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.users}/${userId}`);
  }

  /** U8: crea un administrador con una contraseña inicial. */
  createAdmin(request: CreateAdminRequest): Observable<AppUser> {
    return this.http.post<AppUser>(this.users, request);
  }

  /** U9: edita los datos de un administrador. */
  updateAdmin(userId: number, request: UpdateAdminRequest): Observable<AppUser> {
    return this.http.put<AppUser>(`${this.users}/${userId}`, request);
  }

  /** U10: activa o desactiva una cuenta de cualquier rol. */
  setStatus(userId: number, status: EntityStatus): Observable<AppUser> {
    return this.http.patch<AppUser>(`${this.users}/${userId}/status`, { status });
  }
}
