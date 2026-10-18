import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../Core/Models/page';
import {
  ConfirmEnrollmentRequest,
  CreateEnrollmentRequest,
  EnrollmentDetail,
  EnrollmentQuery,
  EnrollmentSummary,
  PaymentReportRequest,
} from './enrollment.models';

/**
 * Inscripciones. El acudiente pide, consulta, cancela y avisa un pago (E6–E8, E14, E16); el
 * administrador además las lista con más filtros, las confirma, las rechaza y cambia su grupo
 * (E9, E10, E12, E13).
 */
@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/enrollments`;

  /** E6: solicita una inscripción; queda «en revisión» hasta que el administrador la confirme. */
  create(request: CreateEnrollmentRequest): Observable<EnrollmentDetail> {
    return this.http.post<EnrollmentDetail>(this.url, request);
  }

  /**
   * E7: lista paginada. El servidor entrega al acudiente solo las de sus deportistas y al
   * administrador todas, que además puede filtrar por pago, mes, disciplina y grupo.
   */
  list(query: EnrollmentQuery = {}): Observable<Page<EnrollmentSummary>> {
    let params = new HttpParams();
    const filters: [string, string | number | boolean | null | undefined][] = [
      ['page', query.page],
      ['size', query.size],
      ['status', query.status],
      ['paymentStatus', query.paymentStatus],
      ['paymentReported', query.paymentReported],
      ['period', query.period],
      ['disciplineId', query.disciplineId],
      ['groupId', query.groupId],
      ['athleteId', query.athleteId],
    ];
    // Un filtro vacío («Todas») no se envía; el 0 de la primera página sí es un valor.
    for (const [name, value] of filters) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(name, value);
      }
    }
    return this.http.get<Page<EnrollmentSummary>>(this.url, { params });
  }

  /** E8: una inscripción con las franjas de su grupo. */
  get(id: number): Observable<EnrollmentDetail> {
    return this.http.get<EnrollmentDetail>(`${this.url}/${id}`);
  }

  /** E14: cancela. El motivo es opcional. Un acudiente solo puede cancelar las que están en revisión. */
  cancel(id: number, reason?: string): Observable<EnrollmentDetail> {
    const body = reason?.trim() ? { reason: reason.trim() } : {};
    return this.http.post<EnrollmentDetail>(`${this.url}/${id}/cancel`, body);
  }

  /**
   * E16: «ya pagué». Solo marca la inscripción para que el administrador la encuentre; el pago lo
   * registra el administrador. La nota es opcional.
   */
  reportPayment(id: number, notes?: string): Observable<EnrollmentDetail> {
    const body: PaymentReportRequest = notes?.trim() ? { notes: notes.trim() } : {};
    return this.http.post<EnrollmentDetail>(`${this.url}/${id}/payment-report`, body);
  }

  /**
   * E9 (administrador): confirma una inscripción en revisión. Opcionalmente cambia el grupo y registra
   * el primer pago en el mismo paso; si el pago es inválido no se confirma nada.
   */
  confirm(id: number, request: ConfirmEnrollmentRequest = {}): Observable<EnrollmentDetail> {
    return this.http.post<EnrollmentDetail>(`${this.url}/${id}/confirm`, request);
  }

  /** E10 (administrador): rechaza una inscripción en revisión. El motivo es obligatorio. */
  reject(id: number, reason: string): Observable<EnrollmentDetail> {
    return this.http.post<EnrollmentDetail>(`${this.url}/${id}/reject`, { reason: reason.trim() });
  }

  /** E13 (administrador): pasa la inscripción a otro grupo activo de la misma disciplina con cupo. */
  changeGroup(id: number, groupId: number): Observable<EnrollmentDetail> {
    return this.http.patch<EnrollmentDetail>(`${this.url}/${id}/group`, { groupId });
  }
}
