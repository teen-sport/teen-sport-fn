import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { enrollmentDetail, enrollmentSummary, page } from '../../../testing/guardian-fixtures';
import { EnrollmentService } from './enrollment.service';

const URL = `${environment.apiBaseUrl}/enrollments`;

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EnrollmentService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('requests an enrollment with POST /enrollments', () => {
    let result: unknown;
    service.create({ athleteId: 4, groupId: 11, period: '2026-11' }).subscribe((v) => (result = v));
    const request = backend.expectOne(URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ athleteId: 4, groupId: 11, period: '2026-11' });
    request.flush(enrollmentDetail(), { status: 201, statusText: 'Created' });
    expect(result).toMatchObject({ id: 21, status: 'PENDING_REVIEW' });
  });

  it('lists enrollments with no filters by default', () => {
    service.list().subscribe();
    const request = backend.expectOne(URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(page([enrollmentSummary()]));
  });

  it('sends the page, the size, the status and the athlete filters', () => {
    service.list({ page: 1, size: 10, status: 'ACTIVE', athleteId: 4 }).subscribe();
    const request = backend.expectOne((req) => req.url === URL);
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('status')).toBe('ACTIVE');
    expect(request.request.params.get('athleteId')).toBe('4');
    request.flush(page([]));
  });

  it('does not send an empty status filter', () => {
    service.list({ status: null, athleteId: null }).subscribe();
    const request = backend.expectOne((req) => req.url === URL);
    expect(request.request.params.keys()).toEqual([]);
    request.flush(page([]));
  });

  it('reads one enrollment with GET /enrollments/{id}', () => {
    service.get(21).subscribe();
    const request = backend.expectOne(`${URL}/21`);
    expect(request.request.method).toBe('GET');
    request.flush(enrollmentDetail());
  });

  it('cancels with the trimmed reason when there is one', () => {
    service.cancel(21, '  Cambio de horario ').subscribe();
    const request = backend.expectOne(`${URL}/21/cancel`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ reason: 'Cambio de horario' });
    request.flush(enrollmentDetail({ status: 'CANCELLED' }));
  });

  it('cancels with an empty body when there is no reason', () => {
    service.cancel(21).subscribe();
    const request = backend.expectOne(`${URL}/21/cancel`);
    expect(request.request.body).toEqual({});
    request.flush(enrollmentDetail({ status: 'CANCELLED' }));
  });

  it('reports a payment with POST /enrollments/{id}/payment-report', () => {
    service.reportPayment(21, ' Pagué en caja ').subscribe();
    const request = backend.expectOne(`${URL}/21/payment-report`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ notes: 'Pagué en caja' });
    request.flush(enrollmentDetail({ paymentReported: true }));
  });

  it('reports a payment without a note as an empty body', () => {
    service.reportPayment(21, '   ').subscribe();
    const request = backend.expectOne(`${URL}/21/payment-report`);
    expect(request.request.body).toEqual({});
    request.flush(enrollmentDetail({ paymentReported: true }));
  });

  it('sends every administrator filter, leaving out the empty ones', () => {
    service
      .list({
        page: 0,
        size: 10,
        status: 'ACTIVE',
        paymentStatus: 'OVERDUE',
        paymentReported: true,
        period: '2026-11',
        disciplineId: 1,
        groupId: 11,
        athleteId: null,
      })
      .subscribe();
    const request = backend.expectOne((req) => req.url === URL);
    const params = request.request.params;
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('10');
    expect(params.get('status')).toBe('ACTIVE');
    expect(params.get('paymentStatus')).toBe('OVERDUE');
    expect(params.get('paymentReported')).toBe('true');
    expect(params.get('period')).toBe('2026-11');
    expect(params.get('disciplineId')).toBe('1');
    expect(params.get('groupId')).toBe('11');
    expect(params.has('athleteId')).toBe(false);
    request.flush(page([]));
  });

  it('confirms with POST /enrollments/{id}/confirm and an empty body by default', () => {
    service.confirm(21).subscribe();
    const request = backend.expectOne(`${URL}/21/confirm`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush(enrollmentDetail({ status: 'ACTIVE' }));
  });

  it('confirms with another group and the first payment in the same request', () => {
    const payment = { amountPaid: 120000, paymentDate: '2026-11-03' };
    service.confirm(21, { groupId: 12, payment }).subscribe();
    const request = backend.expectOne(`${URL}/21/confirm`);
    expect(request.request.body).toEqual({ groupId: 12, payment });
    request.flush(enrollmentDetail({ status: 'ACTIVE' }));
  });

  it('rejects with POST /enrollments/{id}/reject and the trimmed reason', () => {
    service.reject(21, '  Documentos incompletos ').subscribe();
    const request = backend.expectOne(`${URL}/21/reject`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ reason: 'Documentos incompletos' });
    request.flush(enrollmentDetail({ status: 'REJECTED' }));
  });

  it('changes the group with PATCH /enrollments/{id}/group', () => {
    service.changeGroup(21, 12).subscribe();
    const request = backend.expectOne(`${URL}/21/group`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ groupId: 12 });
    request.flush(enrollmentDetail());
  });
});
