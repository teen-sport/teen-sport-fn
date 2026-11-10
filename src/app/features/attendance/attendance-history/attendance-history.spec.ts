import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { group } from '../../../../testing/admin-fixtures';
import { attendanceRecord } from '../../../../testing/attendance-fixtures';
import { apiError, loginResponse } from '../../../../testing/auth-fixtures';
import { athlete, page } from '../../../../testing/guardian-fixtures';
import { athleteReport } from '../../../../testing/report-fixtures';
import { SessionService } from '../../../Core/Auth/session.service';
import { Role } from '../../../Core/Models/role';
import { Group } from '../../groups/group.models';
import { AttendanceHistory } from './attendance-history';

const API = environment.apiBaseUrl;
const RECORDS = `${API}/attendance-records`;

describe('AttendanceHistory', () => {
  let fixture: ComponentFixture<AttendanceHistory>;
  let backend: HttpTestingController;

  /** Abre la pantalla como el rol dado y contesta lo que pide al abrirse (grupos o deportistas). */
  async function setup(
    role: Role = 'COACH',
    queryParams: Record<string, string> = {},
    options: { groups?: Group[] } = {},
  ): Promise<void> {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AttendanceHistory],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap(queryParams)) },
        },
      ],
    });
    TestBed.inject(SessionService).start(loginResponse(role));
    fixture = TestBed.createComponent(AttendanceHistory);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    if (role === 'GUARDIAN') {
      backend
        .expectOne((req) => req.url === `${API}/athletes`)
        .flush(
          page([
            athlete({ id: 1, firstNames: 'Sofía', lastNames: 'Pérez' }),
            athlete({ id: 2, firstNames: 'Juan', lastNames: 'Quintero' }),
          ]),
        );
    } else {
      backend
        .expectOne((req) => req.url === `${API}/groups`)
        .flush(options.groups ?? [group({ id: 4, name: 'Sub-15 A' })]);
    }
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const records = () => backend.expectOne((req) => req.url === RECORDS);
  const summary = (id: number) =>
    backend.expectOne((req) => req.url === `${API}/reports/attendance/athletes/${id}`);
  const typeIn = async (id: string, value: string): Promise<void> => {
    const field = el().querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  afterEach(() => backend.verify());

  it('asks for the first page of the history, 20 at a time, without filters', async () => {
    await setup();
    const request = records();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.has('athleteId')).toBe(false);
    request.flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('Todavía no hay asistencia');
    expect(el().querySelector('#summary-title')).toBeNull();
  });

  it('shows each mark with its date, group, athlete and a badge', async () => {
    await setup();
    records().flush(
      page([
        attendanceRecord({ id: 1 }),
        attendanceRecord({
          id: 2,
          status: 'ABSENT',
          athlete: { id: 2, firstNames: 'Juan', lastNames: 'Quintero' },
        }),
      ]),
    );
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('10 de noviembre de 2026');
    expect(rows[0].textContent).toContain('Sub-15 A');
    expect(rows[0].textContent).toContain('Fútbol');
    expect(rows[0].textContent).toContain('Sofía Pérez');
    expect(rows[0].querySelector('.badge')?.textContent).toContain('Presente');
    expect(rows[1].querySelector('.badge')?.textContent).toContain('Ausente');
  });

  it('links each athlete of the coach to their own view of the history', async () => {
    await setup('COACH');
    records().flush(page([attendanceRecord()]));
    await fixture.whenStable();
    const link = el().querySelector<HTMLAnchorElement>('tbody a')!;
    expect(link.getAttribute('href')).toBe('/coach/attendance?athleteId=1');
  });

  it('filters by group, mark and dates, always from the first page', async () => {
    await setup('ADMIN', {}, { groups: [group({ id: 4 }), group({ id: 9, name: 'Sub-17' })] });
    records().flush(page([]));
    await fixture.whenStable();

    await typeIn('groupId', '9');
    await typeIn('status', 'ABSENT');
    await typeIn('from', '2026-11-01');
    await typeIn('to', '2026-11-10');
    await submit();

    const request = records();
    expect(request.request.params.get('groupId')).toBe('9');
    expect(request.request.params.get('status')).toBe('ABSENT');
    expect(request.request.params.get('from')).toBe('2026-11-01');
    expect(request.request.params.get('to')).toBe('2026-11-10');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('con esos filtros');
  });

  it('does not ask for anything when the start date is after the end date', async () => {
    await setup();
    records().flush(page([]));
    await fixture.whenStable();
    await typeIn('from', '2026-11-10');
    await typeIn('to', '2026-11-01');
    await submit();
    backend.expectNone((req) => req.url === RECORDS);
    expect(el().querySelector('#range-error')?.textContent).toContain('no puede ser posterior');
    expect(el().querySelector('#from')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('clears the filters and asks for everything again', async () => {
    await setup();
    records().flush(page([]));
    await fixture.whenStable();
    await typeIn('status', 'PRESENT');
    await submit();
    records().flush(page([]));
    await fixture.whenStable();

    const clear = Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Limpiar'),
    )!;
    clear.click();
    await fixture.whenStable();
    const request = records();
    expect(request.request.params.has('status')).toBe(false);
    request.flush(page([]));
  });

  it('goes to the next page keeping the filters', async () => {
    await setup();
    records().flush(
      page([attendanceRecord()], { page: 0, size: 20, totalElements: 45, totalPages: 3 }),
    );
    await fixture.whenStable();
    await typeIn('status', 'PRESENT');
    // Cambiar un filtro sin pulsar «Filtrar» no pide nada; la página sigue con los filtros aplicados.
    backend.expectNone((req) => req.url === RECORDS);
    await submit();
    records().flush(
      page([attendanceRecord()], { page: 0, size: 20, totalElements: 45, totalPages: 3 }),
    );
    await fixture.whenStable();

    const next = Array.from(el().querySelectorAll<HTMLButtonElement>('app-pagination button')).find(
      (b) => b.textContent?.includes('Siguiente'),
    )!;
    next.click();
    await fixture.whenStable();
    const request = records();
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('status')).toBe('PRESENT');
    request.flush(page([]));
  });

  it('shows the error with a retry button when the history does not load', async () => {
    await setup();
    const error = apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falla' });
    records().flush(error, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Falla');
    const retry = Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Reintentar'),
    )!;
    retry.click();
    records().flush(page([]));
  });

  describe('looking at one athlete', () => {
    it('asks for the summary of the athlete from the address and shows it', async () => {
      await setup('COACH', { athleteId: '1' });
      const request = records();
      expect(request.request.params.get('athleteId')).toBe('1');
      request.flush(page([attendanceRecord()]));
      summary(1).flush(athleteReport());
      await fixture.whenStable();

      expect(el().querySelector('#summary-title')?.textContent).toContain('Sofía Pérez');
      const figures = Array.from(el().querySelectorAll('.summary-grid dd')).map((dd) =>
        dd.textContent?.trim(),
      );
      expect(figures).toEqual(['8', '6', '2', '75 %']);
      expect(el().querySelector('section tbody')?.textContent).toContain('Sub-15 A');
      // Ya se mira a uno solo: el nombre de la tabla deja de ser un enlace.
      expect(el().querySelector('.table-card tbody a')).toBeNull();
      expect(el().querySelector('section a')?.getAttribute('href')).toBe('/coach/attendance');
    });

    it('uses the date range of the filter for the summary', async () => {
      await setup('COACH', { athleteId: '1' });
      records().flush(page([attendanceRecord()]));
      summary(1).flush(athleteReport());
      await fixture.whenStable();

      await typeIn('from', '2026-11-01');
      await submit();
      records().flush(page([attendanceRecord()]));
      const request = summary(1);
      expect(request.request.params.get('dateFrom')).toBe('2026-11-01');
      request.flush(athleteReport());
    });

    it('says there is no attendance when the athlete has no recorded sessions', async () => {
      await setup('ADMIN', { athleteId: '1' });
      records().flush(page([]));
      summary(1).flush(athleteReport({ recordedSessions: 0, present: 0, absent: 0, byGroup: [] }));
      await fixture.whenStable();
      expect(el().querySelector('#summary-title')?.textContent).toContain('este deportista');
      expect(el().querySelector('section .empty-state')?.textContent).toContain(
        'Todavía no hay asistencia registrada',
      );
    });

    it('explains the error of the summary without hiding the history', async () => {
      await setup('COACH', { athleteId: '1' });
      records().flush(page([attendanceRecord()]));
      const error = apiError({ status: 403, code: 'ACCESS_DENIED', message: 'no' });
      summary(1).flush(error, { status: 403, statusText: 'Forbidden' });
      await fixture.whenStable();
      expect(el().querySelector('section .alert')?.textContent).toContain('No tienes acceso');
      expect(el().querySelectorAll('.table-card tbody tr').length).toBe(1);
    });

    it('ignores an athleteId that is not a number', async () => {
      await setup('COACH', { athleteId: 'abc' });
      const request = records();
      expect(request.request.params.has('athleteId')).toBe(false);
      request.flush(page([]));
    });
  });

  describe('as the guardian', () => {
    it('offers to choose among the athletes and shows the summary of the chosen one', async () => {
      await setup('GUARDIAN');
      records().flush(page([attendanceRecord()]));
      await fixture.whenStable();
      expect(el().querySelector('#groupId')).toBeNull();
      expect(el().querySelector('#athleteId')?.textContent).toContain('Juan Quintero');
      expect(el().querySelector('.table-card tbody a')).toBeNull();

      await typeIn('athleteId', '2');
      await submit();
      const request = records();
      expect(request.request.params.get('athleteId')).toBe('2');
      request.flush(page([]));
      summary(2).flush(athleteReport({ athleteId: 2 }));
      await fixture.whenStable();
      expect(el().querySelector('#summary-title')?.textContent).toContain('Juan Quintero');
      // El acudiente elige el deportista en la lista: no hay enlace «Ver a todos».
      expect(el().querySelector('section a')).toBeNull();
    });
  });
});
