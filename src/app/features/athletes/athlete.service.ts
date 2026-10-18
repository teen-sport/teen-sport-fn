import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../Core/Models/page';
import { Athlete, AthleteQuery, AthleteRequest } from './athlete.models';

/** Deportistas del acudiente (E1–E4). El servidor solo entrega y acepta los que son suyos. */
@Injectable({ providedIn: 'root' })
export class AthleteService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/athletes`;

  /** E2: lista paginada; `q` busca por nombres y documento. */
  list(query: AthleteQuery = {}): Observable<Page<Athlete>> {
    let params = new HttpParams();
    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query.size !== undefined) {
      params = params.set('size', query.size);
    }
    const text = query.q?.trim();
    if (text) {
      params = params.set('q', text);
    }
    return this.http.get<Page<Athlete>>(this.url, { params });
  }

  /** E3: un deportista. */
  get(id: number): Observable<Athlete> {
    return this.http.get<Athlete>(`${this.url}/${id}`);
  }

  /** E1: registra un deportista. */
  create(request: AthleteRequest): Observable<Athlete> {
    return this.http.post<Athlete>(this.url, request);
  }

  /** E4: reemplaza los datos de un deportista. */
  update(id: number, request: AthleteRequest): Observable<Athlete> {
    return this.http.put<Athlete>(`${this.url}/${id}`, request);
  }
}
