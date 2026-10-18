import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CoachService } from './coach.service';

describe('CoachService', () => {
  let service: CoachService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CoachService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('always lists users with the COACH role and sends the filters', () => {
    service.list({ page: 1, size: 10, q: ' Carlos ', status: 'ACTIVE' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/users'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('role')).toBe('COACH');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('q')).toBe('Carlos');
    expect(req.request.params.get('status')).toBe('ACTIVE');
    req.flush({ content: [], page: 1, size: 10, totalElements: 0, totalPages: 0 });
  });

  it('omits an empty search and an empty status', () => {
    service.list({ q: '  ', status: null }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/users'));
    expect(req.request.params.has('q')).toBe(false);
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
  });

  it('loads the short coach list for the group form', () => {
    service.options('ACTIVE').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/coaches'));
    expect(req.request.params.get('status')).toBe('ACTIVE');
    req.flush([]);
  });

  it('creates a coach with POST /users', () => {
    const body = {
      role: 'COACH' as const,
      firstNames: 'Carlos',
      lastNames: 'Ruiz',
      idType: 'CC',
      idNumber: '1000000001',
      email: 'carlos@correo.com',
      phone: '3001234567',
      password: 'Clave-segura1',
    };
    service.create(body).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/users'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('updates with PUT /users/{id}', () => {
    const body = { firstNames: 'Carlos', lastNames: 'Ruiz', email: 'c@correo.com', phone: '300' };
    service.update(8, body).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/users/8'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('changes the status with PATCH /users/{id}/status', () => {
    service.setStatus(8, 'INACTIVE').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/users/8/status'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'INACTIVE' });
    req.flush({});
  });
});
