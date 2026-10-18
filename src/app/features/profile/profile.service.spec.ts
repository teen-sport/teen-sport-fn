import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { loginResponse } from '../../../testing/auth-fixtures';
import { myProfile } from '../../../testing/profile-fixtures';
import { SessionService } from '../../Core/Auth/session.service';
import { ProfileService } from './profile.service';

const URL = `${environment.apiBaseUrl}/users/me`;

describe('ProfileService', () => {
  let service: ProfileService;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfileService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('reads the own profile with GET /users/me', () => {
    let result: unknown;
    service.getMe().subscribe((profile) => (result = profile));
    const request = backend.expectOne(URL);
    expect(request.request.method).toBe('GET');
    request.flush(myProfile('COACH'));
    expect(result).toMatchObject({ email: 'marta@correo.com', role: 'COACH' });
  });

  it('replaces the profile with PUT and refreshes the name in the session', () => {
    const session = TestBed.inject(SessionService);
    session.start(loginResponse('GUARDIAN'));

    service
      .update({ firstNames: 'Marta Lucía', lastNames: 'Gómez Ríos', phone: '3009998877' })
      .subscribe();
    const request = backend.expectOne(URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      firstNames: 'Marta Lucía',
      lastNames: 'Gómez Ríos',
      phone: '3009998877',
    });
    request.flush(myProfile('GUARDIAN', { firstNames: 'Marta Lucía', lastNames: 'Gómez Ríos' }));

    expect(session.user()?.firstNames).toBe('Marta Lucía');
    expect(session.user()?.lastNames).toBe('Gómez Ríos');
  });

  it('changes the password with PUT /users/me/password', () => {
    let done = false;
    service
      .changePassword({ currentPassword: 'Actual1!', newPassword: 'Nueva2@pass' })
      .subscribe(() => (done = true));
    const request = backend.expectOne(`${URL}/password`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      currentPassword: 'Actual1!',
      newPassword: 'Nueva2@pass',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
  });
});
