import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Discipline, GroupAvailability } from './catalog.models';

/** Consulta de lo que ofrece la academia: disciplinas y grupos con cupo. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** H1: disciplinas activas. */
  disciplines(): Observable<Discipline[]> {
    return this.http.get<Discipline[]>(`${this.base}/disciplines`);
  }

  /**
   * E5: grupos activos con sus cupos en un mes.
   * @param period mes «YYYY-MM», desde el mes actual (el servidor rechaza meses pasados)
   * @param disciplineId si se indica, solo los grupos de esa disciplina
   */
  availability(period: string, disciplineId?: number | null): Observable<GroupAvailability[]> {
    let params = new HttpParams().set('period', period);
    if (disciplineId != null) {
      params = params.set('disciplineId', disciplineId);
    }
    return this.http.get<GroupAvailability[]>(`${this.base}/availability`, { params });
  }
}
