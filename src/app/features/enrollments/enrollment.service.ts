import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../Core/Models/page';
import {
  CreateEnrollmentRequest,
  EnrollmentDetail,
  EnrollmentQuery,
  EnrollmentSummary,
  PaymentReportRequest,
} from './enrollment.models';

/** Inscripciones del acudiente: pedir, consultar, cancelar y avisar un pago (E6–E8, E14, E16). */
@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/enrollments`;

  /** E6: solicita una inscripción; queda «en revisión» hasta que el administrador la confirme. */
  create(request: CreateEnrollmentRequest): Observable<EnrollmentDetail> {
    return this.http.post<EnrollmentDetail>(this.url, request);
  }

  /** E7: lista paginada; el servidor solo entrega las de los deportistas del acudiente. */
  list(query: EnrollmentQuery = {}): Observable<Page<EnrollmentSummary>> {
    let params = new HttpParams();
    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query.size !== undefined) {
      params = params.set('size', query.size);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.athleteId != null) {
      params = params.set('athleteId', query.athleteId);
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
}
