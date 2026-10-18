import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../Core/Models/page';
import { EnrollmentDetail } from '../enrollments/enrollment.models';
import { Payment, PaymentQuery, RegisterPaymentRequest } from './payment.models';

/**
 * Pagos. El historial (E19) lo ve el acudiente (solo los de sus deportistas) y el administrador
 * (todos, con filtros). Solo el administrador registra un pago (E17) o marca una inscripción en mora
 * (E18): el acudiente únicamente avisa que pagó.
 */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/payments`;
  private readonly enrollmentsUrl = `${environment.apiBaseUrl}/enrollments`;

  list(query: PaymentQuery = {}): Observable<Page<Payment>> {
    let params = new HttpParams();
    if (query.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query.size !== undefined) {
      params = params.set('size', query.size);
    }
    if (query.enrollmentId != null) {
      params = params.set('enrollmentId', query.enrollmentId);
    }
    if (query.athleteId != null) {
      params = params.set('athleteId', query.athleteId);
    }
    if (query.from) {
      params = params.set('from', query.from);
    }
    if (query.to) {
      params = params.set('to', query.to);
    }
    return this.http.get<Page<Payment>>(this.url, { params });
  }

  /**
   * E17: registra el pago de la mensualidad. Deja la inscripción «al día» y borra el aviso del
   * acudiente. El servidor valida monto, fecha y que sea el único pago de ese mes.
   */
  register(enrollmentId: number, request: RegisterPaymentRequest): Observable<Payment> {
    return this.http.post<Payment>(`${this.enrollmentsUrl}/${enrollmentId}/payments`, request);
  }

  /** E18: marca la inscripción «en mora». Volver a «al día» solo se logra registrando un pago. */
  markOverdue(enrollmentId: number): Observable<EnrollmentDetail> {
    return this.http.patch<EnrollmentDetail>(
      `${this.enrollmentsUrl}/${enrollmentId}/payment-status`,
      { paymentStatus: 'OVERDUE' },
    );
  }
}
