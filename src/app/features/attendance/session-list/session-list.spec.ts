import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { group } from '../../../../testing/admin-fixtures';
import { apiError, loginResponse } from '../../../../testing/auth-fixtures';
import { trainingSession } from '../../../../testing/attendance-fixtures';
import { SessionService } from '../../../Core/Auth/session.service';
import { Role } from '../../../Core/Models/role';
import { SessionList } from './session-list';

const SESSIONS = `${environment.apiBaseUrl}/sessions`;
const GROUPS = `${environment.apiBaseUrl}/groups`;

describe('SessionList', () => {
  let fixture: ComponentFixture<SessionList>;
  let backend: HttpTestingController;

  /** Abre la pantalla como el rol dado. Administrador y entrenador también piden sus grupos (para el filtro). */
  async function setup(
    queryParams: Record<string, string> = {},
    role: Role = 'COACH',
    groups = [group({ id: 4, name: 'Sub-15 A' })],
  ): Promise<void> {
    // Hoy es martes 10 de noviembre de 2026 (hora de Colombia): la semana va del 9 al 15.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T15:00:00Z') });
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [SessionList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });
    TestBed.inject(SessionService).start(loginResponse(role));
    fixture = TestBed.createComponent(SessionList);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    if (role !== 'GUARDIAN') {
      groupsRequest().flush(groups);
      await fixture.whenStable();
    }
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = () => backend.expectOne((req) => req.url === SESSIONS);
  const groupsRequest = () => backend.expectOne((req) => req.url === GROUPS);
  const buttonByText = (text: string): HTMLButtonElement | undefined =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  it('asks for the current week, from Monday to Sunday', async () => {
    await setup();
    const request = list();
    expect(request.request.params.get('from')).toBe('2026-11-09');
    expect(request.request.params.get('to')).toBe('2026-11-15');
    request.flush([]);
    await fixture.whenStable();
    expect(el().textContent).toContain('9 de noviembre de 2026 al 15 de noviembre de 2026');
    expect(el().querySelector('.empty-state')?.textContent).toContain('No tienes sesiones');
  });

  it('shows the sessions in order of day and hour', async () => {
    await setup();
    list().flush([
      trainingSession({ id: 2, date: '2026-11-12', startTime: '09:00', endTime: '10:00' }),
      trainingSession({ id: 3, date: '2026-11-10', startTime: '18:00', endTime: '19:00' }),
      trainingSession({ id: 1, date: '2026-11-10', startTime: '16:00', endTime: '17:30' }),
    ]);
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('Martes, 10 de noviembre');
    expect(rows[0].textContent).toContain('16:00 – 17:30');
    expect(rows[0].textContent).toContain('Sub-15 A');
    expect(rows[0].textContent).toContain('Fútbol');
    expect(rows[1].textContent).toContain('18:00');
    expect(rows[2].textContent).toContain('Jueves, 12 de noviembre');
  });

  it('offers to take the attendance of a session of today and marks it as pending', async () => {
    await setup();
    list().flush([trainingSession()]);
    await fixture.whenStable();

    const row = el().querySelector('tbody tr')!;
    expect(row.textContent).toContain('Pendiente');
    expect(row.textContent).toContain('Programada');
    const link = row.querySelector('a')!;
    expect(link.textContent).toContain('Tomar asistencia');
    expect(link.getAttribute('href')).toBe('/coach/sessions/31/attendance');
    expect(el().querySelector('.notice')?.textContent).toContain('1 sesión con la asistencia');
  });

  it('counts several pending sessions in the summary', async () => {
    await setup();
    list().flush([
      trainingSession({ id: 1, date: '2026-11-09' }),
      trainingSession({ id: 2, date: '2026-11-10' }),
    ]);
    await fixture.whenStable();
    expect(el().querySelector('.notice')?.textContent).toContain('2 sesiones');
  });

  it('lets the coach review a session that already has attendance', async () => {
    await setup();
    list().flush([trainingSession({ status: 'COMPLETED', attendanceRecorded: true })]);
    await fixture.whenStable();

    const row = el().querySelector('tbody tr')!;
    expect(row.textContent).toContain('Registrada');
    expect(row.textContent).toContain('Realizada');
    expect(row.querySelector('a')?.textContent).toContain('Revisar asistencia');
    expect(el().querySelector('.notice')).toBeNull();
  });

  it('does not offer attendance for a cancelled session or for a future one', async () => {
    await setup();
    list().flush([
      trainingSession({ id: 1, status: 'CANCELLED', date: '2026-11-09' }),
      trainingSession({ id: 2, date: '2026-11-13' }),
    ]);
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows[0].querySelector('a')).toBeNull();
    expect(rows[0].textContent).toContain('Cancelada');
    expect(rows[1].textContent).not.toContain('asistencia');
    expect(rows[1].querySelector('a[href$="/attendance"]')).toBeNull();
    expect(el().querySelector('.notice')).toBeNull();
  });

  it('goes to the previous and the next week, and back to this one', async () => {
    await setup();
    list().flush([]);
    await fixture.whenStable();
    expect(buttonByText('Esta semana')!.getAttribute('aria-current')).toBe('date');

    buttonByText('Anterior')!.click();
    let request = list();
    expect(request.request.params.get('from')).toBe('2026-11-02');
    expect(request.request.params.get('to')).toBe('2026-11-08');
    request.flush([]);
    await fixture.whenStable();
    expect(buttonByText('Esta semana')!.hasAttribute('aria-current')).toBe(false);

    buttonByText('Siguiente')!.click();
    request = list();
    expect(request.request.params.get('from')).toBe('2026-11-09');
    request.flush([]);
    await fixture.whenStable();

    buttonByText('Siguiente')!.click();
    request = list();
    expect(request.request.params.get('from')).toBe('2026-11-16');
    request.flush([]);
    await fixture.whenStable();

    buttonByText('Esta semana')!.click();
    request = list();
    expect(request.request.params.get('from')).toBe('2026-11-09');
    request.flush([]);
  });

  it('does not ask for the week again when «Esta semana» is pressed on the current week', async () => {
    await setup();
    list().flush([]);
    await fixture.whenStable();
    buttonByText('Esta semana')!.click();
    backend.expectNone((req) => req.url === SESSIONS);
    expect(buttonByText('Esta semana')!.disabled).toBe(false);
  });

  it('ignores the answer of a week that was left before it arrived', async () => {
    await setup();
    const first = list();
    buttonByText('Siguiente')!.click();
    expect(first.cancelled).toBe(true);
    list().flush([]);
    await fixture.whenStable();
    expect(el().textContent).toContain('16 de noviembre de 2026');
  });

  it('shows the notice that comes after saving the attendance', async () => {
    await setup({ saved: 'attendance' });
    list().flush([]);
    await fixture.whenStable();
    expect(el().querySelector('.notice')?.textContent).toContain('Asistencia guardada');
  });

  it('shows the error with a retry button when loading fails', async () => {
    await setup();
    const error = apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falla' });
    list().flush(error, { status: 500, statusText: error.code });
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Falla');
    buttonByText('Reintentar')!.click();
    list().flush([]);
  });

  it('asks for the sessions of one group when the filter is used', async () => {
    await setup({}, 'COACH', [group({ id: 4 }), group({ id: 9, name: 'Sub-17' })]);
    list().flush([]);
    await fixture.whenStable();

    const select = el().querySelector<HTMLSelectElement>('#groupFilter')!;
    expect(select.textContent).toContain('Todos mis grupos');
    select.value = '9';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    const request = list();
    expect(request.request.params.get('groupId')).toBe('9');
    request.flush([]);
  });

  it('does not show the group filter when the coach has a single group', async () => {
    await setup();
    list().flush([]);
    await fixture.whenStable();
    expect(el().querySelector('#groupFilter')).toBeNull();
  });

  it('opens the week of the date in the address', async () => {
    await setup({ date: '2026-11-18', saved: 'created' });
    const request = list();
    expect(request.request.params.get('from')).toBe('2026-11-16');
    expect(request.request.params.get('to')).toBe('2026-11-22');
    request.flush([]);
    await fixture.whenStable();
    expect(el().querySelector('.notice')?.textContent).toContain('Sesión creada');
    expect(buttonByText('Esta semana')!.hasAttribute('aria-current')).toBe(false);
  });

  describe('as the coach', () => {
    it('opens the schedule menu with its button and closes it with Escape or a click outside', async () => {
      await setup();
      list().flush([]);
      await fixture.whenStable();

      const trigger = buttonByText('Programar')!;
      const menu = el().querySelector<HTMLElement>('#schedule-menu-list')!;
      expect(menu.hidden).toBe(true);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      trigger.click();
      await fixture.whenStable();
      expect(menu.hidden).toBe(false);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await fixture.whenStable();
      expect(menu.hidden).toBe(true);

      trigger.click();
      await fixture.whenStable();
      document.body.click();
      await fixture.whenStable();
      expect(menu.hidden).toBe(true);
    });

    it('offers to generate and create sessions, and to reschedule or cancel the programmed ones', async () => {
      await setup();
      list().flush([trainingSession({ date: '2026-11-13' })]);
      await fixture.whenStable();

      const top = Array.from(el().querySelectorAll<HTMLAnchorElement>('.schedule-menu a'));
      expect(top.map((link) => link.getAttribute('href'))).toEqual([
        '/coach/sessions/generate',
        '/coach/sessions/new',
      ]);
      const row = el().querySelector('tbody tr')!;
      expect(row.querySelector('a[href="/coach/sessions/31/edit"]')?.textContent).toContain(
        'Reprogramar',
      );
      expect(buttonByText('Cancelar sesión')).toBeTruthy();
    });

    it('does not offer to reschedule or cancel a session that is no longer programmed', async () => {
      await setup();
      list().flush([
        trainingSession({ id: 1, status: 'COMPLETED', attendanceRecorded: true }),
        trainingSession({ id: 2, status: 'CANCELLED', date: '2026-11-09', notes: 'Lluvia' }),
      ]);
      await fixture.whenStable();
      expect(el().querySelector('a[href$="/edit"]')).toBeNull();
      expect(buttonByText('Cancelar sesión')).toBeUndefined();
      expect(el().textContent).toContain('Motivo: Lluvia');
    });

    it('cancels a session with the reason that was written and reloads the week', async () => {
      await setup();
      list().flush([trainingSession({ date: '2026-11-13' })]);
      await fixture.whenStable();

      buttonByText('Cancelar sesión')!.click();
      await fixture.whenStable();
      expect(el().querySelector('[role="dialog"]')?.textContent).toContain(
        '¿Cancelar esta sesión?',
      );
      expect(el().querySelector('[role="dialog"]')?.textContent).toContain(
        'Se avisará por correo a los acudientes',
      );

      const reason = el().querySelector<HTMLTextAreaElement>('#confirm-reason')!;
      reason.value = ' Cancha en mantenimiento ';
      reason.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      el().querySelector<HTMLButtonElement>('.dialog .actions button')!.click();

      const cancel = backend.expectOne(`${SESSIONS}/31/cancel`);
      expect(cancel.request.method).toBe('POST');
      expect(cancel.request.body).toEqual({ reason: 'Cancha en mantenimiento' });
      cancel.flush(trainingSession({ status: 'CANCELLED', date: '2026-11-13' }));
      await fixture.whenStable();
      list().flush([trainingSession({ status: 'CANCELLED', date: '2026-11-13' })]);
      await fixture.whenStable();

      expect(el().querySelector('[role="dialog"]')).toBeNull();
      expect(el().querySelector('.notice')?.textContent).toContain('Sesión cancelada');
    });

    it('does not cancel without a reason', async () => {
      await setup();
      list().flush([trainingSession({ date: '2026-11-13' })]);
      await fixture.whenStable();
      buttonByText('Cancelar sesión')!.click();
      await fixture.whenStable();
      el().querySelector<HTMLButtonElement>('.dialog .actions button')!.click();
      await fixture.whenStable();
      backend.expectNone(`${SESSIONS}/31/cancel`);
      expect(el().querySelector('#confirm-reason-error')).toBeTruthy();
    });

    it('closes the dialog without cancelling when «Volver» is pressed', async () => {
      await setup();
      list().flush([trainingSession({ date: '2026-11-13' })]);
      await fixture.whenStable();
      buttonByText('Cancelar sesión')!.click();
      await fixture.whenStable();
      buttonByText('Volver')!.click();
      await fixture.whenStable();
      expect(el().querySelector('[role="dialog"]')).toBeNull();
      backend.expectNone(`${SESSIONS}/31/cancel`);
    });

    it('explains why a session could not be cancelled and reloads the week', async () => {
      await setup();
      list().flush([trainingSession({ date: '2026-11-13' })]);
      await fixture.whenStable();
      buttonByText('Cancelar sesión')!.click();
      await fixture.whenStable();
      const reason = el().querySelector<HTMLTextAreaElement>('#confirm-reason')!;
      reason.value = 'Lluvia';
      reason.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      el().querySelector<HTMLButtonElement>('.dialog .actions button')!.click();

      const error = apiError({ status: 409, code: 'INVALID_STATE', message: 'Estado inválido' });
      backend.expectOne(`${SESSIONS}/31/cancel`).flush(error, { status: 409, statusText: 'x' });
      await fixture.whenStable();
      list().flush([trainingSession({ status: 'COMPLETED', date: '2026-11-13' })]);
      await fixture.whenStable();

      expect(el().querySelector('.alert')?.textContent).toContain('están programadas');
      expect(el().querySelector('[role="dialog"]')).toBeNull();
    });
  });

  describe('as the administrator', () => {
    it('shows every coach, offers the group filter and does not offer to take attendance', async () => {
      await setup({}, 'ADMIN', [group({ id: 4 }), group({ id: 9, name: 'Sub-17' })]);
      list().flush([trainingSession()]);
      await fixture.whenStable();

      expect(el().querySelector('h1')?.textContent).toContain('Sesiones de entrenamiento');
      expect(el().textContent).toContain('Carlos Ruiz');
      expect(el().querySelector<HTMLSelectElement>('#groupFilter')?.textContent).toContain(
        'Todos los grupos',
      );
      expect(el().querySelector('a[href$="/attendance"]')).toBeNull();
      const top = Array.from(el().querySelectorAll<HTMLAnchorElement>('.schedule-menu a'));
      expect(top.map((link) => link.getAttribute('href'))).toEqual([
        '/admin/sessions/generate',
        '/admin/sessions/new',
      ]);
      expect(el().querySelector('tbody a[href="/admin/sessions/31/edit"]')).toBeTruthy();
    });

    it('says there are no sessions without speaking to a coach', async () => {
      await setup({}, 'ADMIN');
      list().flush([]);
      await fixture.whenStable();
      expect(el().querySelector('.empty-state')?.textContent).toContain('No hay sesiones');
    });
  });

  describe('as the guardian', () => {
    it('only reads: shows the athletes that attend and no actions', async () => {
      await setup({}, 'GUARDIAN');
      list().flush([
        trainingSession({
          athletes: [
            { id: 1, firstNames: 'Sofía' },
            { id: 2, firstNames: 'Juan' },
          ],
        }),
      ]);
      await fixture.whenStable();

      expect(el().querySelector('h1')?.textContent).toContain('Sesiones de mis deportistas');
      expect(el().querySelector('.schedule-menu')).toBeNull();
      expect(el().querySelector('#groupFilter')).toBeNull();
      expect(el().querySelector('tbody a')).toBeNull();
      expect(el().querySelector('tbody button')).toBeNull();
      expect(el().querySelector('tbody tr')?.textContent).toContain('Sofía, Juan');
      expect(el().querySelector('.notice')).toBeNull();
    });

    it('says that the athletes have no sessions', async () => {
      await setup({}, 'GUARDIAN');
      list().flush([]);
      await fixture.whenStable();
      expect(el().querySelector('.empty-state')?.textContent).toContain('Tus deportistas');
    });
  });
});
