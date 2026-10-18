import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EntityStatus } from '../../Core/Models/role';
import { Discipline } from '../catalog/catalog.models';
import { DisciplineRequest } from './discipline.models';

/** Administración de disciplinas (H1 a H5). Solo el administrador crea, edita y cambia el estado. */
@Injectable({ providedIn: 'root' })
export class DisciplineService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/disciplines`;

  /** H1: el administrador recibe todas; si se indica `status`, solo las de ese estado. */
  list(status?: EntityStatus | null): Observable<Discipline[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Discipline[]>(this.url, { params });
  }

  get(id: number): Observable<Discipline> {
    return this.http.get<Discipline>(`${this.url}/${id}`);
  }

  create(request: DisciplineRequest): Observable<Discipline> {
    return this.http.post<Discipline>(this.url, request);
  }

  update(id: number, request: DisciplineRequest): Observable<Discipline> {
    return this.http.put<Discipline>(`${this.url}/${id}`, request);
  }

  setStatus(id: number, status: EntityStatus): Observable<Discipline> {
    return this.http.patch<Discipline>(`${this.url}/${id}/status`, { status });
  }
}
