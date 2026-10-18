import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../environments/environment';
import { loginResponse } from '../testing/auth-fixtures';
import { enrollmentDetail, page } from '../testing/guardian-fixtures';
import { SessionService } from './Core/Auth/session.service';
import { Role } from './Core/Models/role';
import { routes } from './app.routes';

describe('routes of the guardian and the administrator', () => {
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

  it.each([
    ['/admin', 'app-home-shell'],
    ['/admin/disciplines/new', 'app-discipline-form'],
    ['/admin/coaches/new', 'app-coach-form'],
  ])('resolves %s to its screen for the administrator', async (url, selector) => {
    const harness = await setup('ADMIN');
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    expect((harness.routeNativeElement as HTMLElement).querySelector(selector)).toBeTruthy();
  });

  it('opens the list of disciplines and asks the API for them', async () => {
    const harness = await setup('ADMIN');
    await harness.navigateByUrl('/admin/disciplines');
    backend.expectOne((req) => req.url === `${environment.apiBaseUrl}/disciplines`).flush([]);
    await harness.fixture.whenStable();
    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('app-discipline-list'),
    ).toBeTruthy();
    expect(TestBed.inject(Router).url).toBe('/admin/disciplines');
  });

  it.each([
    ['/admin/enrollments', 'app-admin-enrollment-list'],
    ['/admin/payments', 'app-admin-payment-list'],
  ])('opens %s and asks the API for what it shows', async (url, selector) => {
    const harness = await setup('ADMIN');
    await harness.navigateByUrl(url);
    const api = environment.apiBaseUrl;
    if (selector === 'app-admin-enrollment-list') {
      backend.expectOne((req) => req.url === `${api}/disciplines`).flush([]);
      backend.expectOne((req) => req.url === `${api}/groups`).flush([]);
      await harness.fixture.whenStable();
      backend.expectOne((req) => req.url === `${api}/enrollments`).flush(page([]));
    } else {
      backend.expectOne((req) => req.url === `${api}/payments`).flush(page([]));
    }
    await harness.fixture.whenStable();
    expect((harness.routeNativeElement as HTMLElement).querySelector(selector)).toBeTruthy();
    expect(TestBed.inject(Router).url).toBe(url);
  });

  it('opens the detail of an enrollment', async () => {
    const harness = await setup('ADMIN');
    await harness.navigateByUrl('/admin/enrollments/21');
    backend
      .expectOne(`${environment.apiBaseUrl}/enrollments/21`)
      .flush(enrollmentDetail({ status: 'REJECTED' }));
    await harness.fixture.whenStable();
    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('app-admin-enrollment-view'),
    ).toBeTruthy();
  });

  it.each(['COACH', 'GUARDIAN'] as const)(
    'sends a %s away from the screens of the administrator to their own home',
    async (role) => {
      const harness = await setup(role);
      await harness.navigateByUrl('/admin/groups');
      expect(TestBed.inject(Router).url).toBe(role === 'COACH' ? '/coach' : '/guardian');
    },
  );

  it('sends a visitor without session to the login', async () => {
    const harness = await setup(null);
    await harness.navigateByUrl('/admin/coaches');
    expect(TestBed.inject(Router).url).toContain('/login');
  });
});
