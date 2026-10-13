import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { apiError, loginResponse } from '../../../testing/auth-fixtures';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from './session.service';

const API = environment.apiBaseUrl;

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let session: SessionService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });

  afterEach(() => backend.verify());

  it('adds the bearer token to API requests', () => {
    session.start(loginResponse());
    http.get(`${API}/users/me`).subscribe();
    const request = backend.expectOne(`${API}/users/me`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    request.flush({});
  });

  it('does not send the token to login, registration or other hosts', () => {
    session.start(loginResponse());
    http.post(`${API}/auth/login`, {}).subscribe();
    http.post(`${API}/users/register`, {}).subscribe();
    http.get('https://other.example/data').subscribe();
    for (const request of backend.match(() => true)) {
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    }
  });

  it('ends the session and goes to the login when the token expired', () => {
    session.start(loginResponse());
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    http.get(`${API}/users/me`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/users/me`).flush(apiError({ status: 401, code: 'TOKEN_EXPIRED' }), {
      status: 401,
      statusText: 'Unauthorized',
    });
    expect(session.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: expect.objectContaining({ reason: 'expired' }),
    });
  });

  it('keeps the session on other errors', () => {
    session.start(loginResponse());
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    http.get(`${API}/users`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/users`).flush(apiError({ status: 403, code: 'ACCESS_DENIED' }), {
      status: 403,
      statusText: 'Forbidden',
    });
    expect(session.isAuthenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not treat wrong credentials as an expired session', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    http.post(`${API}/auth/login`, {}).subscribe({ error: () => undefined });
    backend
      .expectOne(`${API}/auth/login`)
      .flush(apiError({ status: 401, code: 'INVALID_CREDENTIALS' }), {
        status: 401,
        statusText: 'Unauthorized',
      });
    expect(navigate).not.toHaveBeenCalled();
  });
});
