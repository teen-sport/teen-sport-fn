import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AthleteAttendanceReport,
  AttendanceReport,
  AttendanceReportQuery,
  EnrollmentReport,
  RecurrentAbsence,
  RecurrentAbsenceQuery,
  UserReport,
} from './report.models';

/** Reportes e indicadores (R1 a R5). Los cálculos los hace el servidor; el front solo los muestra. */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/reports`;

  /** R1 (administrador): indicadores de las inscripciones del mes `period` («YYYY-MM»). */
  enrollments(period: string): Observable<EnrollmentReport> {
    return this.http.get<EnrollmentReport>(`${this.url}/enrollments`, {
      params: new HttpParams().set('period', period),
    });
  }

  /** R2 (administrador y entrenador): cobertura del registro de asistencia y asistencia por grupo. */
  attendance(query: AttendanceReportQuery = {}): Observable<AttendanceReport> {
    let params = new HttpParams();
    if (query.dateFrom) {
      params = params.set('dateFrom', query.dateFrom);
    }
    if (query.dateTo) {
      params = params.set('dateTo', query.dateTo);
    }
    if (query.groupId !== undefined) {
      params = params.set('groupId', query.groupId);
    }
    if (query.disciplineId !== undefined) {
      params = params.set('disciplineId', query.disciplineId);
    }
    return this.http.get<AttendanceReport>(`${this.url}/attendance`, { params });
  }

  /** R3 (los tres roles): asistencia de un deportista, en un rango de fechas si se indica. */
  athleteAttendance(
    athleteId: number,
    range: { dateFrom?: string; dateTo?: string } = {},
  ): Observable<AthleteAttendanceReport> {
    let params = new HttpParams();
    if (range.dateFrom) {
      params = params.set('dateFrom', range.dateFrom);
    }
    if (range.dateTo) {
      params = params.set('dateTo', range.dateTo);
    }
    return this.http.get<AthleteAttendanceReport>(`${this.url}/attendance/athletes/${athleteId}`, {
      params,
    });
  }

  /** R4 (administrador y entrenador): deportistas con inasistencias seguidas. */
  recurrentAbsences(query: RecurrentAbsenceQuery = {}): Observable<RecurrentAbsence[]> {
    let params = new HttpParams();
    if (query.minConsecutive !== undefined) {
      params = params.set('minConsecutive', query.minConsecutive);
    }
    if (query.groupId !== undefined) {
      params = params.set('groupId', query.groupId);
    }
    if (query.dateFrom) {
      params = params.set('dateFrom', query.dateFrom);
    }
    return this.http.get<RecurrentAbsence[]>(`${this.url}/attendance/recurrent-absences`, {
      params,
    });
  }

  /** R5 (administrador): indicadores de las cuentas de usuario; los creados se cuentan en el mes `period`. */
  users(period: string): Observable<UserReport> {
    return this.http.get<UserReport>(`${this.url}/users`, {
      params: new HttpParams().set('period', period),
    });
  }
}
