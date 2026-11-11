import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../Core/Models/page';
import {
  AttendanceRecord,
  AttendanceRecordQuery,
  AttendanceRoster,
  CreateSessionRequest,
  GenerateSessionsRequest,
  GenerateSessionsResponse,
  RecordAttendanceRequest,
  SessionQuery,
  TrainingSession,
  UpdateSessionRequest,
} from './attendance.models';

/**
 * Sesiones de entrenamiento y asistencia: calendario (A3), crear, generar, reprogramar y cancelar
 * (A1, A2, A5 y A6), la lista de asistencia (A7 y A8) y el historial de asistencia (A9).
 */
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);
  private readonly sessions = `${environment.apiBaseUrl}/sessions`;

  /** A3: sesiones del rango pedido. Al entrenador el servidor le devuelve solo las de sus grupos. */
  listSessions(query: SessionQuery = {}): Observable<TrainingSession[]> {
    let params = new HttpParams();
    if (query.from) {
      params = params.set('from', query.from);
    }
    if (query.to) {
      params = params.set('to', query.to);
    }
    if (query.groupId !== undefined) {
      params = params.set('groupId', query.groupId);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    return this.http.get<TrainingSession[]>(this.sessions, { params });
  }

  /** A4: una sesión. Sirve para llenar el formulario de reprogramación. */
  getSession(sessionId: number): Observable<TrainingSession> {
    return this.http.get<TrainingSession>(`${this.sessions}/${sessionId}`);
  }

  /** A1: crea una sesión suelta. */
  createSession(request: CreateSessionRequest): Observable<TrainingSession> {
    return this.http.post<TrainingSession>(this.sessions, request);
  }

  /** A2: crea las sesiones de un grupo a partir de sus franjas semanales; omite las que ya existen. */
  generateSessions(request: GenerateSessionsRequest): Observable<GenerateSessionsResponse> {
    return this.http.post<GenerateSessionsResponse>(`${this.sessions}/generate`, request);
  }

  /** A5: cambia la fecha y las horas de una sesión programada. */
  updateSession(sessionId: number, request: UpdateSessionRequest): Observable<TrainingSession> {
    return this.http.put<TrainingSession>(`${this.sessions}/${sessionId}`, request);
  }

  /** A6: cancela una sesión programada; el motivo es obligatorio y queda guardado en sus notas. */
  cancelSession(sessionId: number, reason: string): Observable<TrainingSession> {
    return this.http.post<TrainingSession>(`${this.sessions}/${sessionId}/cancel`, { reason });
  }

  /** A7: lista de la sesión con las marcas ya guardadas. */
  roster(sessionId: number): Observable<AttendanceRoster> {
    return this.http.get<AttendanceRoster>(`${this.sessions}/${sessionId}/attendance`);
  }

  /** A8: guarda la asistencia de toda la lista. Guardar otra vez reemplaza las marcas anteriores. */
  record(sessionId: number, request: RecordAttendanceRequest): Observable<AttendanceRoster> {
    return this.http.put<AttendanceRoster>(`${this.sessions}/${sessionId}/attendance`, request);
  }

  /**
   * A9: historial de asistencia, paginado y del más reciente al más antiguo. El administrador ve todo,
   * el entrenador lo de sus grupos y el acudiente lo de sus deportistas (el servidor lo decide).
   */
  listRecords(query: AttendanceRecordQuery = {}): Observable<Page<AttendanceRecord>> {
    let params = new HttpParams();
    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query.size !== undefined) {
      params = params.set('size', query.size);
    }
    if (query.athleteId !== undefined) {
      params = params.set('athleteId', query.athleteId);
    }
    if (query.groupId !== undefined) {
      params = params.set('groupId', query.groupId);
    }
    if (query.from) {
      params = params.set('from', query.from);
    }
    if (query.to) {
      params = params.set('to', query.to);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    return this.http.get<Page<AttendanceRecord>>(`${environment.apiBaseUrl}/attendance-records`, {
      params,
    });
  }
}
