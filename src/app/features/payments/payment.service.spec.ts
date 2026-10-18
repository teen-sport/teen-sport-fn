import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { enrollmentDetail, page, payment } from '../../../testing/guardian-fixtures';
import { PaymentService } from './payment.service';

const URL = `${environment.apiBaseUrl}/payments`;

describe('PaymentService', () => {
  let service: PaymentService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PaymentService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('lists the payment history with GET /payments', () => {
    let result: unknown;
    service.list().subscribe((value) => (result = value));
    const request = backend.expectOne(URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(page([payment()]));
    expect(result).toMatchObject({ content: [{ amountPaid: 120000 }] });
  });

  it('sends the page, the size and the enrollment and athlete filters', () => {
    service.list({ page: 1, size: 10, enrollmentId: 21, athleteId: 4 }).subscribe();
    const request = backend.expectOne((req) => req.url === URL);
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('enrollmentId')).toBe('21');
    expect(request.request.params.get('athleteId')).toBe('4');
    request.flush(page([]));
  });

  it('sends the date range', () => {
    service.list({ from: '2026-11-01', to: '2026-11-30' }).subscribe();
    const request = backend.expectOne((req) => req.url === URL);
    expect(request.request.params.get('from')).toBe('2026-11-01');
    expect(request.request.params.get('to')).toBe('2026-11-30');
    request.flush(page([]));
  });

  it('registers a payment with POST /enrollments/{id}/payments', () => {
    const body = { amountPaid: 120000, paymentDate: '2026-11-03', receiptReference: 'R-0042' };
    let result: unknown;
    service.register(21, body).subscribe((value) => (result = value));
    const request = backend.expectOne(`${environment.apiBaseUrl}/enrollments/21/payments`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(payment(), { status: 201, statusText: 'Created' });
    expect(result).toMatchObject({ id: 31 });
  });

  it('marks an enrollment overdue with PATCH /enrollments/{id}/payment-status', () => {
    service.markOverdue(21).subscribe();
    const request = backend.expectOne(`${environment.apiBaseUrl}/enrollments/21/payment-status`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ paymentStatus: 'OVERDUE' });
    request.flush(enrollmentDetail({ paymentStatus: 'OVERDUE' }));
  });
});
