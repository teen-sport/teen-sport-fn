import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { apiError } from '../../../../testing/auth-fixtures';
import { enrollmentReport } from '../../../../testing/report-fixtures';
import { EnrollmentReport } from './enrollment-report';

const REPORT = `${environment.apiBaseUrl}/reports/enrollments`;

describe('EnrollmentReport', () => {
  let fixture: ComponentFixture<EnrollmentReport>;
  let backend: HttpTestingController;

  async function setup(): Promise<void> {
    // Hoy es martes 10 de noviembre de 2026 (hora de Colombia).
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T15:00:00Z') });
    TestBed.configureTestingModule({
      imports: [EnrollmentReport],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(EnrollmentReport);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const request = () => backend.expectOne((req) => req.url === REPORT);

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  it('asks for the current month and offers the last twelve', async () => {
    await setup();
    const call = request();
    expect(call.request.params.get('period')).toBe('2026-11');
    call.flush(enrollmentReport());
    await fixture.whenStable();

    const options = el().querySelectorAll<HTMLOptionElement>('#enrollment-period option');
    expect(options.length).toBe(12);
    expect(options[11].value).toBe('2026-11');
    expect(options[0].value).toBe('2025-12');
    expect(options[11].textContent).toContain('Noviembre de 2026');
  });

  it('shows the indicators, the states with zero when the server leaves them out, and the payments', async () => {
    await setup();
    request().flush(
      enrollmentReport({ byStatus: { ACTIVE: 6, PENDING_REVIEW: 4 }, totalRequests: 10 }),
    );
    await fixture.whenStable();

    const figures = Array.from(el().querySelectorAll('.summary-grid dd')).map((dd) =>
      dd.textContent?.trim(),
    );
    expect(figures).toEqual(['10', '60 %', '10 %', '18,5 h']);

    const tables = el().querySelectorAll('table');
    const states = Array.from(tables[0].querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('th, td'))
        .map((cell) => cell.textContent?.trim())
        .join(' '),
    );
    expect(states).toEqual(['En revisión 4', 'Activa 6', 'Rechazada 0', 'Cancelada 0']);
    expect(tables[1].textContent).toContain('Al día');
    expect(tables[1].querySelectorAll('tbody tr')[0].textContent).toContain('4');
    expect(tables[1].querySelectorAll('tbody tr')[1].textContent).toContain('2');
    expect(tables[2].textContent).toContain('Fútbol');
    expect(tables[2].textContent).toContain('Baloncesto');
  });

  it('shows a dash when no enrollment was confirmed and zero when there are no payments', async () => {
    await setup();
    request().flush(enrollmentReport({ averageConfirmationHours: null, payments: {} }));
    await fixture.whenStable();
    expect(el().querySelectorAll('.summary-grid dd')[3].textContent?.trim()).toBe('—');
    expect(el().querySelectorAll('table')[1].querySelectorAll('tbody td')[0].textContent).toContain(
      '0',
    );
  });

  it('says so when the month has no requests', async () => {
    await setup();
    request().flush(enrollmentReport({ totalRequests: 0, byStatus: {}, byDiscipline: [] }));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('Noviembre de 2026');
    expect(el().querySelector('.summary-grid')).toBeNull();
  });

  it('asks again when another month is chosen', async () => {
    await setup();
    request().flush(enrollmentReport());
    await fixture.whenStable();
    const select = el().querySelector<HTMLSelectElement>('#enrollment-period')!;
    select.value = '2026-09';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    const call = request();
    expect(call.request.params.get('period')).toBe('2026-09');
    call.flush(enrollmentReport({ period: '2026-09' }));
  });

  it('shows the error with a retry button', async () => {
    await setup();
    const error = apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falla' });
    request().flush(error, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Falla');
    Array.from(el().querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    request().flush(enrollmentReport());
  });
});
