import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../environments/environment';
import { loginResponse } from '../testing/auth-fixtures';
import { page } from '../testing/guardian-fixtures';
import { SessionService } from './Core/Auth/session.service';
import { Role } from './Core/Models/role';
import { routes } from './app.routes';

describe('routes of the guardian', () => {
  let backend: HttpTestingController;

  async function setup(role: Role | null): Promise<RouterTestingHarness> {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    if (role) {
      TestBed.inject(SessionService).start(loginResponse(role));
    }
    backend = TestBed.inject(HttpTestingController);
    return RouterTestingHarness.create();
  }

  afterEach(() => backend.verify());

  it('opens a screen of the guardian inside the app frame', async () => {
    const harness = await setup('GUARDIAN');
    await harness.navigateByUrl('/guardian/payments');
    backend.expectOne((req) => req.url === `${environment.apiBaseUrl}/payments`).flush(page([]));
    await harness.fixture.whenStable();

    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('app-my-payments')).toBeTruthy();
    expect(el.querySelector('.app-nav a[href="/guardian/payments"]')).toBeTruthy();
    expect(TestBed.inject(Router).url).toBe('/guardian/payments');
  });

  it.each([
    ['/guardian', 'app-home-shell', null],
    ['/guardian/athletes/new', 'app-athlete-form', null],
    ['/guardian/athletes/4/edit', 'app-athlete-form', '/athletes/4'],
  ])('resolves %s to its screen', async (url, selector, request) => {
    const harness = await setup('GUARDIAN');
    await harness.navigateByUrl(url);
    if (request) {
      backend.expectOne(`${environment.apiBaseUrl}${request}`).flush({
        id: 4,
        guardianId: 3,
        firstNames: 'Sofía',
        lastNames: 'Pérez',
        idType: 'TI',
        idNumber: '1',
        birthDate: '2011-03-02',
        age: 15,
        hasActiveEnrollment: false,
      });
    }
    await harness.fixture.whenStable();
    expect((harness.routeNativeElement as HTMLElement).querySelector(selector)).toBeTruthy();
  });

  it.each(['COACH', 'ADMIN'] as const)(
    'sends a %s away from the screens of the guardian to their own home',
    async (role) => {
      const harness = await setup(role);
      await harness.navigateByUrl('/guardian/enrollments');
      expect(TestBed.inject(Router).url).toBe(role === 'COACH' ? '/coach' : '/admin');
    },
  );

  it('sends a visitor without session to the login', async () => {
    const harness = await setup(null);
    await harness.navigateByUrl('/guardian/athletes');
    expect(TestBed.inject(Router).url).toContain('/login');
  });
});
