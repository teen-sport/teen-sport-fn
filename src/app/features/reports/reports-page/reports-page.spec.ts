import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { group } from '../../../../testing/admin-fixtures';
import { loginResponse } from '../../../../testing/auth-fixtures';
import { attendanceReport, enrollmentReport } from '../../../../testing/report-fixtures';
import { SessionService } from '../../../Core/Auth/session.service';
import { Role } from '../../../Core/Models/role';
import { ReportsPage } from './reports-page';

const API = environment.apiBaseUrl;

describe('ReportsPage', () => {
  let fixture: ComponentFixture<ReportsPage>;
  let backend: HttpTestingController;

  async function setup(role: Role): Promise<void> {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ReportsPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SessionService).start(loginResponse(role));
    fixture = TestBed.createComponent(ReportsPage);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const answer = (path: string, body: object) =>
    backend.expectOne((req) => req.url === `${API}${path}`).flush(body);

  afterEach(() => backend.verify());

  it('shows attendance, absences and enrollments to the administrator', async () => {
    await setup('ADMIN');
    answer('/groups', [group({ id: 4 }), group({ id: 9, name: 'Sub-17' })]);
    answer('/reports/attendance', attendanceReport());
    answer('/reports/attendance/recurrent-absences', []);
    answer('/reports/enrollments', enrollmentReport());
    await fixture.whenStable();

    expect(el().querySelector('h1')?.textContent).toContain('Reportes e indicadores');
    expect(el().querySelector('app-attendance-report')).toBeTruthy();
    expect(el().querySelector('app-recurrent-absences')).toBeTruthy();
    expect(el().querySelector('app-enrollment-report')).toBeTruthy();
    // Los grupos que cargó la pantalla llegan a los filtros de las secciones.
    expect(el().querySelector('#attendance-group')?.textContent).toContain('Sub-17');
    expect(el().querySelector('#absences-group')?.textContent).toContain('Sub-17');
  });

  it('does not show the enrollments, nor ask for them, to the coach', async () => {
    await setup('COACH');
    answer('/groups', [group({ id: 4 })]);
    answer('/reports/attendance', attendanceReport());
    answer('/reports/attendance/recurrent-absences', []);
    await fixture.whenStable();

    expect(el().querySelector('app-enrollment-report')).toBeNull();
    backend.expectNone((req) => req.url === `${API}/reports/enrollments`);
  });

  it('keeps the reports working when the groups do not load, only without the group filter', async () => {
    await setup('COACH');
    backend
      .expectOne((req) => req.url === `${API}/groups`)
      .flush({}, { status: 500, statusText: 'Server Error' });
    answer('/reports/attendance', attendanceReport());
    answer('/reports/attendance/recurrent-absences', []);
    await fixture.whenStable();
    expect(el().querySelector('.summary-grid')).toBeTruthy();
    expect(el().querySelector('#attendance-group')).toBeNull();
  });
});
