import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../Core/Models/page';
import { EntityStatus } from '../../Core/Models/role';
import {
  CoachOption,
  CoachQuery,
  CoachUser,
  CreateCoachRequest,
  UpdateCoachRequest,
} from './coach.models';

/** Administración de entrenadores: son cuentas de usuario con rol COACH (U6 a U11). */
@Injectable({ providedIn: 'root' })
export class CoachService {
  private readonly http = inject(HttpClient);
  private readonly users = `${environment.apiBaseUrl}/users`;

  /** U6: listado paginado de usuarios, filtrado siempre por el rol COACH. */
  list(query: CoachQuery = {}): Observable<Page<CoachUser>> {
    let params = new HttpParams().set('role', 'COACH');
    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query.size !== undefined) {
      params = params.set('size', query.size);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    const text = query.q?.trim();
    if (text) {
      params = params.set('q', text);
    }
    return this.http.get<Page<CoachUser>>(this.users, { params });
  }

  /** U11: lista corta (sin paginar) para elegir el entrenador de un grupo. */
  options(status?: EntityStatus | null): Observable<CoachOption[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<CoachOption[]>(`${environment.apiBaseUrl}/coaches`, { params });
  }

  get(userId: number): Observable<CoachUser> {
    return this.http.get<CoachUser>(`${this.users}/${userId}`);
  }

  create(request: CreateCoachRequest): Observable<CoachUser> {
    return this.http.post<CoachUser>(this.users, request);
  }

  update(userId: number, request: UpdateCoachRequest): Observable<CoachUser> {
    return this.http.put<CoachUser>(`${this.users}/${userId}`, request);
  }

  setStatus(userId: number, status: EntityStatus): Observable<CoachUser> {
    return this.http.patch<CoachUser>(`${this.users}/${userId}/status`, { status });
  }
}
