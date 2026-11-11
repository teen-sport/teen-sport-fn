import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { apiError } from '../../../../testing/auth-fixtures';
import { userReport } from '../../../../testing/report-fixtures';
import { UserReport } from './user-report';

const REPORT = `${environment.apiBaseUrl}/reports/users`;

describe('UserReport', () => {
  let fixture: ComponentFixture<UserReport>;
  let backend: HttpTestingController;

  async function setup(): Promise<void> {
    // Hoy es martes 10 de noviembre de 2026 (hora de Colombia).
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T15:00:00Z') });
    TestBed.configureTestingModule({
      imports: [UserReport],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(UserReport);
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
    call.flush(userReport());
    await fixture.whenStable();

    const options = el().querySelectorAll<HTMLOptionElement>('#user-period option');
    expect(options.length).toBe(12);
    expect(options[11].value).toBe('2026-11');
    expect(options[0].value).toBe('2025-12');
  });

  it('shows the indicators and the accounts of each role in Spanish', async () => {
    await setup();
    request().flush(userReport());
    await fixture.whenStable();

    const figures = Array.from(el().querySelectorAll('.summary-grid dd')).map((dd) =>
      dd.textContent?.trim(),
    );
    expect(figures).toEqual(['7', '3', '38', '95 %']);
    expect(el().querySelector('.summary-grid')?.textContent).toContain('Noviembre de 2026');

    const rows = Array.from(el().querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('th, td'))
        .map((cell) => cell.textContent?.trim())
        .join(' '),
    );
    expect(rows).toEqual(['Administrador 0 2 0', 'Entrenador 1 5 1', 'Acudiente 6 40 2']);
  });

  it('shows zeros when nothing was created in the month and there are no guardians', async () => {
    await setup();
    request().flush(
      userReport({
        registeredInPeriod: 0,
        guardiansWithAthletes: 0,
        guardianLinkRate: 0,
        inactiveAccounts: 0,
      }),
    );
    await fixture.whenStable();
    const figures = Array.from(el().querySelectorAll('.summary-grid dd')).map((dd) =>
      dd.textContent?.trim(),
    );
    expect(figures).toEqual(['0', '0', '0', '0 %']);
  });

  it('asks again when another month is chosen', async () => {
    await setup();
    request().flush(userReport());
    await fixture.whenStable();
    const select = el().querySelector<HTMLSelectElement>('#user-period')!;
    select.value = '2026-09';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    const call = request();
    expect(call.request.params.get('period')).toBe('2026-09');
    call.flush(userReport({ period: '2026-09' }));
  });

  it('shows the error with a retry button', async () => {
    await setup();
    request().flush(apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falla' }), {
      status: 500,
      statusText: 'Server Error',
    });
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Falla');
    Array.from(el().querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    request().flush(userReport());
  });

  it('explains that the guardian does not have access', async () => {
    await setup();
    request().flush(apiError({ status: 403, code: 'ACCESS_DENIED', message: 'Prohibido' }), {
      status: 403,
      statusText: 'Forbidden',
    });
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('No tienes acceso');
  });
});
