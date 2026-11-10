import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../environments/environment';
import { attendanceRoster, trainingSession } from '../testing/attendance-fixtures';
import { loginResponse } from '../testing/auth-fixtures';
import { attendanceReport, enrollmentReport } from '../testing/report-fixtures';
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
    ['/admin/users/new', 'app-admin-form'],
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

  it('opens the list of users and asks the API for every role', async () => {
    const harness = await setup('ADMIN');
    await harness.navigateByUrl('/admin/users');
    const request = backend.expectOne((req) => req.url === `${environment.apiBaseUrl}/users`);
    expect(request.request.params.has('role')).toBe(false);
    request.flush(page([]));
    await harness.fixture.whenStable();
    expect((harness.routeNativeElement as HTMLElement).querySelector('app-user-list')).toBeTruthy();
    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('.app-nav a[href="/admin/users"]'),
    ).toBeTruthy();
  });

  it.each(['COACH', 'GUARDIAN'] as const)(
    'does not let a %s into the users of the administrator',
    async (role) => {
      const harness = await setup(role);
      await harness.navigateByUrl('/admin/users/new');
      expect(TestBed.inject(Router).url).toBe(role === 'COACH' ? '/coach' : '/guardian');
    },
  );

  it('opens the sessions of the coach and asks the API for the current week', async () => {
    const harness = await setup('COACH');
    await harness.navigateByUrl('/coach/sessions');
    const request = backend.expectOne((req) => req.url === `${environment.apiBaseUrl}/sessions`);
    expect(request.request.params.has('from')).toBe(true);
    expect(request.request.params.has('to')).toBe(true);
    request.flush([]);
    backend.expectOne((req) => req.url === `${environment.apiBaseUrl}/groups`).flush([]);
    await harness.fixture.whenStable();
    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('app-session-list')).toBeTruthy();
    expect(el.querySelector('.app-nav a[href="/coach/sessions"]')).toBeTruthy();
  });

  it.each([
    ['COACH', '/coach/sessions/generate', 'app-session-generate'],
    ['COACH', '/coach/sessions/new', 'app-session-form'],
    ['ADMIN', '/admin/sessions/generate', 'app-session-generate'],
    ['ADMIN', '/admin/sessions/new', 'app-session-form'],
  ] as const)('opens %s %s and asks the API for the active groups', async (role, url, selector) => {
    const harness = await setup(role);
    await harness.navigateByUrl(url);
    const request = backend.expectOne((req) => req.url === `${environment.apiBaseUrl}/groups`);
    expect(request.request.params.get('status')).toBe('ACTIVE');
    request.flush([]);
    await harness.fixture.whenStable();
    expect((harness.routeNativeElement as HTMLElement).querySelector(selector)).toBeTruthy();
  });

  it.each([
    ['COACH', '/coach/sessions/31/edit'],
    ['ADMIN', '/admin/sessions/31/edit'],
  ] as const)('opens %s %s and asks the API for the session', async (role, url) => {
    const harness = await setup(role);
    await harness.navigateByUrl(url);
    backend.expectOne(`${environment.apiBaseUrl}/sessions/31`).flush(trainingSession());
    await harness.fixture.whenStable();
    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('app-session-form'),
    ).toBeTruthy();
  });

  it('opens the sessions of the administrator and asks the API for every group', async () => {
    const harness = await setup('ADMIN');
    await harness.navigateByUrl('/admin/sessions');
    backend.expectOne((req) => req.url === `${environment.apiBaseUrl}/sessions`).flush([]);
    backend.expectOne((req) => req.url === `${environment.apiBaseUrl}/groups`).flush([]);
    await harness.fixture.whenStable();
    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('app-session-list')).toBeTruthy();
    expect(el.querySelector('.app-nav a[href="/admin/sessions"]')).toBeTruthy();
  });

  it.each(['ADMIN', 'COACH'] as const)(
    'opens the attendance history of the %s and asks the API for the first page',
    async (role) => {
      const harness = await setup(role);
      await harness.navigateByUrl(role === 'ADMIN' ? '/admin/attendance' : '/coach/attendance');
      const api = environment.apiBaseUrl;
      backend.expectOne((req) => req.url === `${api}/groups`).flush([]);
      backend.expectOne((req) => req.url === `${api}/attendance-records`).flush(page([]));
      await harness.fixture.whenStable();
      expect(
        (harness.routeNativeElement as HTMLElement).querySelector('app-attendance-history'),
      ).toBeTruthy();
    },
  );

  it.each([
    ['ADMIN', '/admin/reports', true],
    ['COACH', '/coach/reports', false],
  ] as const)('opens the reports of the %s at %s', async (role, url, withEnrollments) => {
    const harness = await setup(role);
    await harness.navigateByUrl(url);
    const api = environment.apiBaseUrl;
    backend.expectOne((req) => req.url === `${api}/groups`).flush([]);
    backend.expectOne((req) => req.url === `${api}/reports/attendance`).flush(attendanceReport());
    backend
      .expectOne((req) => req.url === `${api}/reports/attendance/recurrent-absences`)
      .flush([]);
    if (withEnrollments) {
      backend
        .expectOne((req) => req.url === `${api}/reports/enrollments`)
        .flush(enrollmentReport());
    }
    await harness.fixture.whenStable();
    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('app-reports-page'),
    ).toBeTruthy();
  });

  it('opens the sessions of the guardian, who only reads them, and asks the API for the week', async () => {
    const harness = await setup('GUARDIAN');
    await harness.navigateByUrl('/guardian/sessions');
    backend.expectOne((req) => req.url === `${environment.apiBaseUrl}/sessions`).flush([]);
    backend.expectNone((req) => req.url === `${environment.apiBaseUrl}/groups`);
    await harness.fixture.whenStable();
    const el = harness.routeNativeElement as HTMLElement;
    expect(el.querySelector('app-session-list')).toBeTruthy();
    expect(el.querySelector('.app-nav a[href="/guardian/sessions"]')).toBeTruthy();
  });

  it('opens the attendance history of the guardian and asks for their athletes', async () => {
    const harness = await setup('GUARDIAN');
    await harness.navigateByUrl('/guardian/attendance');
    const api = environment.apiBaseUrl;
    backend.expectOne((req) => req.url === `${api}/athletes`).flush(page([]));
    backend.expectOne((req) => req.url === `${api}/attendance-records`).flush(page([]));
    await harness.fixture.whenStable();
    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('app-attendance-history'),
    ).toBeTruthy();
  });

  it.each([
    ['ADMIN', '/guardian/sessions', '/admin'],
    ['COACH', '/guardian/attendance', '/coach'],
    ['GUARDIAN', '/admin/reports', '/guardian'],
    ['GUARDIAN', '/coach/reports', '/guardian'],
    ['COACH', '/admin/attendance', '/coach'],
    ['ADMIN', '/coach/reports', '/admin'],
  ] as const)('does not let a %s into %s', async (role, url, home) => {
    const harness = await setup(role);
    await harness.navigateByUrl(url);
    expect(TestBed.inject(Router).url).toBe(home);
  });

  it.each(['COACH', 'GUARDIAN'] as const)(
    'does not let a %s into the sessions of the administrator',
    async (role) => {
      const harness = await setup(role);
      await harness.navigateByUrl('/admin/sessions');
      expect(TestBed.inject(Router).url).toBe(role === 'COACH' ? '/coach' : '/guardian');
    },
  );

  it('opens the attendance of a session and asks the API for its roster', async () => {
    const harness = await setup('COACH');
    await harness.navigateByUrl('/coach/sessions/31/attendance');
    backend.expectOne(`${environment.apiBaseUrl}/sessions/31/attendance`).flush(attendanceRoster());
    await harness.fixture.whenStable();
    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('app-attendance-form'),
    ).toBeTruthy();
  });

  it('opens the home of the coach', async () => {
    const harness = await setup('COACH');
    await harness.navigateByUrl('/coach');
    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('app-home-shell'),
    ).toBeTruthy();
  });

  it.each(['ADMIN', 'GUARDIAN'] as const)(
    'does not let a %s into the screens of the coach',
    async (role) => {
      const harness = await setup(role);
      await harness.navigateByUrl('/coach/sessions');
      expect(TestBed.inject(Router).url).toBe(role === 'ADMIN' ? '/admin' : '/guardian');
    },
  );

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
