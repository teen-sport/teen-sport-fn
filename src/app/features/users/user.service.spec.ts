import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';

const EMPTY_PAGE = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 };

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists users sending the role, the status, the search text and the page', () => {
    service
      .list({ page: 2, size: 10, q: ' Ana ', role: 'GUARDIAN', status: 'INACTIVE' })
      .subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/users'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('q')).toBe('Ana');
    expect(req.request.params.get('role')).toBe('GUARDIAN');
    expect(req.request.params.get('status')).toBe('INACTIVE');
    req.flush(EMPTY_PAGE);
  });

  it('does not send the filters that are empty', () => {
    service.list({ q: '   ', role: null, status: null }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/users'));
    expect(req.request.params.keys()).toEqual([]);
    req.flush(EMPTY_PAGE);
  });

  it('gets one user with GET /users/{id}', () => {
    service.get(5).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/users/5'));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('creates an administrator with POST /users', () => {
    const body = {
      role: 'ADMIN' as const,
      firstNames: 'Laura',
      lastNames: 'Gómez',
      idType: 'CC',
      idNumber: '1000000002',
      email: 'laura@correo.com',
      phone: '3001234567',
      password: 'Clave-segura1',
    };
    service.createAdmin(body).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/users'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('updates an administrator with PUT /users/{id}', () => {
    const body = { firstNames: 'Laura', lastNames: 'Gómez', email: 'l@correo.com', phone: '300' };
    service.updateAdmin(9, body).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/users/9'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('changes the status with PATCH /users/{id}/status', () => {
    service.setStatus(9, 'INACTIVE').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/users/9/status'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'INACTIVE' });
    req.flush({});
  });
});
