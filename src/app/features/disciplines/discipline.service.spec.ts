import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { discipline } from '../../../testing/guardian-fixtures';
import { DisciplineService } from './discipline.service';

describe('DisciplineService', () => {
  let service: DisciplineService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DisciplineService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists every discipline when no status is given', () => {
    service.list().subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/disciplines'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([discipline()]);
  });

  it('filters by status', () => {
    service.list('INACTIVE').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/disciplines'));
    expect(req.request.params.get('status')).toBe('INACTIVE');
    req.flush([]);
  });

  it('gets one discipline', () => {
    service.get(3).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/disciplines/3'));
    expect(req.request.method).toBe('GET');
    req.flush(discipline({ id: 3 }));
  });

  it('creates with POST', () => {
    const body = { name: 'Natación', monthlyFee: 90000 };
    service.create(body).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/disciplines'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(discipline({ id: 9, name: 'Natación' }));
  });

  it('updates with PUT', () => {
    const body = { name: 'Fútbol', description: 'Nuevo', monthlyFee: 130000 };
    service.update(1, body).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/disciplines/1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(discipline());
  });

  it('changes the status with PATCH', () => {
    service.setStatus(1, 'INACTIVE').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/disciplines/1/status'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'INACTIVE' });
    req.flush(discipline({ status: 'INACTIVE' }));
  });
});
