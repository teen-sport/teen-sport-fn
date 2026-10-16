import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../Core/Models/page';
import { Payment, PaymentQuery } from './payment.models';

/** Historial de pagos (E19). El servidor solo entrega los de los deportistas del acudiente. */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/payments`;

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
    return this.http.get<Page<Payment>>(this.url, { params });
  }
}
