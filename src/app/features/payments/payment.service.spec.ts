import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { page, payment } from '../../../testing/guardian-fixtures';
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
});
