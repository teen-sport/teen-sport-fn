import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { attendanceRoster, rosterEntry } from '../../../../testing/attendance-fixtures';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { AttendanceForm } from './attendance-form';

const ROSTER = `${environment.apiBaseUrl}/sessions/31/attendance`;

describe('AttendanceForm', () => {
  let fixture: ComponentFixture<AttendanceForm>;
  let backend: HttpTestingController;
  let router: Router;

  async function setup(id = '31'): Promise<void> {
    // Hoy es martes 10 de noviembre de 2026 (hora de Colombia).
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T15:00:00Z') });
    TestBed.configureTestingModule({
      imports: [AttendanceForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
        },
      ],
    });
    fixture = TestBed.createComponent(AttendanceForm);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  }

  async function load(roster = attendanceRoster()): Promise<void> {
    backend.expectOne(ROSTER).flush(roster);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const radio = (athleteId: number, status: 'PRESENT' | 'ABSENT'): HTMLInputElement =>
    el().querySelectorAll<HTMLInputElement>(`input[name="mark-${athleteId}"]`)[
      status === 'PRESENT' ? 0 : 1
    ];
  const buttonByText = (text: string): HTMLButtonElement | undefined =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );
  const summary = (): string => el().querySelector('.summary p')!.textContent!.replace(/\s+/g, ' ');

  async function click(target: HTMLElement | undefined): Promise<void> {
    target!.click();
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  describe('taking the attendance', () => {
    it('lists the athletes of the group, ordered as the server sends them, with nothing marked', async () => {
      await setup();
      await load();

      expect(el().textContent).toContain('Sub-15 A');
      expect(el().textContent).toContain('Martes, 10 de noviembre');
      const names = Array.from(el().querySelectorAll('legend')).map((l) => l.textContent?.trim());
      expect(names).toEqual(['Pérez Sofía', 'Quintero Juan', 'Ramírez Valeria']);
      expect(summary()).toContain('Marcados 0 de 3');
      expect(el().querySelectorAll('input:checked').length).toBe(0);
    });

    it('shows the age and the emergency contact of the guardian of each athlete', async () => {
      await setup();
      await load(
        attendanceRoster({
          records: [
            rosterEntry({ athleteId: 1 }),
            rosterEntry({
              athleteId: 2,
              firstNames: 'Juan',
              lastNames: 'Quintero',
              age: 12,
              guardian: { firstNames: 'Luis', lastNames: 'Quintero', phone: null },
            }),
          ],
        }),
      );
      const info = Array.from(el().querySelectorAll('.athlete-info')).map((p) =>
        p.textContent!.replace(/\s+/g, ' ').trim(),
      );
      expect(info).toEqual([
        '14 años · Acudiente: Marta Gómez · Tel. 3001234567',
        '12 años · Acudiente: Luis Quintero · sin teléfono registrado',
      ]);
      expect(el().querySelector('.athlete-info a')?.getAttribute('href')).toBe('tel:3001234567');
    });

    it('marks everybody present with one button', async () => {
      await setup();
      await load();
      await click(buttonByText('Marcar a todos presentes'));

      expect(summary()).toContain('Marcados 3 de 3');
      expect(summary()).toContain('Presentes 3');
      expect(radio(2, 'PRESENT').checked).toBe(true);
    });

    it('changes one athlete to absent after marking everybody present', async () => {
      await setup();
      await load();
      await click(buttonByText('Marcar a todos presentes'));
      await click(radio(2, 'ABSENT'));

      expect(summary()).toContain('Presentes 2');
      expect(summary()).toContain('Ausentes 1');
      expect(radio(2, 'ABSENT').checked).toBe(true);
      expect(radio(2, 'PRESENT').checked).toBe(false);
    });

    it('does not save while somebody is not marked, and shows who is missing', async () => {
      await setup();
      await load();
      await click(radio(1, 'PRESENT'));
      await submit();

      expect(el().querySelector('.alert')?.textContent).toContain('Faltan 2 deportistas');
      expect(el().querySelectorAll('.hint-missing').length).toBe(2);
      backend.expectNone(ROSTER);
    });

    it('says «Falta 1» when only one athlete is missing', async () => {
      await setup();
      await load();
      await click(radio(1, 'PRESENT'));
      await click(radio(2, 'ABSENT'));
      await submit();
      expect(el().querySelector('.alert')?.textContent).toContain('Falta 1 deportista');
    });

    it('clears the warning when the coach marks the missing athlete', async () => {
      await setup();
      await load();
      await click(radio(1, 'PRESENT'));
      await submit();
      await click(radio(2, 'PRESENT'));
      expect(el().querySelector('.alert')).toBeNull();
    });

    it('sends one mark per athlete and goes back to the sessions', async () => {
      await setup();
      await load();
      await click(buttonByText('Marcar a todos presentes'));
      await click(radio(3, 'ABSENT'));
      await submit();

      const request = backend.expectOne(ROSTER);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({
        records: [
          { athleteId: 1, status: 'PRESENT' },
          { athleteId: 2, status: 'PRESENT' },
          { athleteId: 3, status: 'ABSENT' },
        ],
      });
      request.flush(attendanceRoster({ status: 'COMPLETED', attendanceRecorded: true }));
      expect(router.navigate).toHaveBeenCalledWith(['/coach/sessions'], {
        queryParams: { saved: 'attendance' },
      });
    });

    it('does not send a second request while the first one is in progress', async () => {
      await setup();
      await load();
      await click(buttonByText('Marcar a todos presentes'));
      await submit();
      await submit();
      backend.expectOne(ROSTER).flush(attendanceRoster({ attendanceRecorded: true }));
    });
  });

  describe('correcting an attendance that was already saved', () => {
    it('shows the saved marks and explains that saving again corrects them', async () => {
      await setup();
      await load(
        attendanceRoster({
          status: 'COMPLETED',
          attendanceRecorded: true,
          records: [
            rosterEntry({ athleteId: 1, status: 'PRESENT' }),
            rosterEntry({
              athleteId: 2,
              firstNames: 'Juan',
              lastNames: 'Quintero',
              status: 'ABSENT',
            }),
          ],
        }),
      );

      expect(el().querySelector('.hint')?.textContent).toContain('guarda de nuevo');
      expect(radio(1, 'PRESENT').checked).toBe(true);
      expect(radio(2, 'ABSENT').checked).toBe(true);
      expect(summary()).toContain('Marcados 2 de 2');
    });
  });

  describe('when the session does not allow attendance', () => {
    it('explains that a cancelled session has no attendance and shows no form', async () => {
      await setup();
      await load(attendanceRoster({ status: 'CANCELLED' }));
      expect(el().querySelector('.alert')?.textContent).toContain('cancelada');
      expect(el().querySelector('form')).toBeNull();
      expect(el().querySelector('a[href="/coach/sessions"]')).toBeTruthy();
    });

    it('explains that a future session cannot be marked yet and shows no form', async () => {
      await setup();
      await load(attendanceRoster({ date: '2026-11-12' }));
      expect(el().querySelector('.notice')?.textContent).toContain('desde ese día');
      expect(el().querySelector('form')).toBeNull();
    });

    it('allows a session of today even if the hour has not come', async () => {
      await setup();
      await load(attendanceRoster({ date: '2026-11-10' }));
      expect(el().querySelector('form')).toBeTruthy();
    });

    it('explains that there is nobody to mark when the roster is empty', async () => {
      await setup();
      await load(attendanceRoster({ records: [] }));
      expect(el().querySelector('.empty-state')?.textContent).toContain('no hay lista que marcar');
      expect(el().querySelector('form')).toBeNull();
    });
  });

  describe('when something fails', () => {
    it('shows the error with a retry button when the roster cannot be loaded', async () => {
      await setup();
      const error = apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falla' });
      backend.expectOne(ROSTER).flush(error, { status: 500, statusText: error.code });
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('Falla');
      await click(buttonByText('Reintentar'));
      await load();
      expect(el().querySelector('form')).toBeTruthy();
    });

    it('tells a coach that the session is not from one of their groups', async () => {
      await setup();
      failWith(
        backend,
        '/sessions/31/attendance',
        apiError({ status: 403, code: 'ACCESS_DENIED', message: 'x' }),
      );
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('no es de uno de tus grupos');
      expect(el().querySelector('a[href="/coach/sessions"]')).toBeTruthy();
    });

    it('does not call the API when the id in the address is not a number', async () => {
      await setup('abc');
      expect(el().querySelector('.alert')?.textContent).toContain('no existe');
      backend.expectNone(`${environment.apiBaseUrl}/sessions/abc/attendance`);
    });

    it.each([
      ['FUTURE_SESSION', 422, 'desde el día de la sesión'],
      ['SESSION_CANCELLED', 409, 'está cancelada'],
      ['ACCESS_DENIED', 403, 'no es de uno de tus grupos'],
    ] as const)('shows the %s error and keeps the marks', async (code, status, text) => {
      await setup();
      await load();
      await click(buttonByText('Marcar a todos presentes'));
      await submit();
      failWith(backend, '/sessions/31/attendance', apiError({ status, code, message: 'x' }));
      await fixture.whenStable();

      expect(el().querySelector('.alert')?.textContent).toContain(text);
      expect(summary()).toContain('Marcados 3 de 3');
      expect(buttonByText('Guardar asistencia')!.disabled).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('reloads the roster when it changed and keeps what the coach had marked', async () => {
      await setup();
      await load();
      await click(buttonByText('Marcar a todos presentes'));
      await click(radio(2, 'ABSENT'));
      await submit();
      failWith(
        backend,
        '/sessions/31/attendance',
        apiError({ status: 422, code: 'INCOMPLETE_ATTENDANCE', message: 'x' }),
      );
      await fixture.whenStable();

      // El servidor ahora trae un deportista nuevo (id 4) que no estaba antes.
      await load(
        attendanceRoster({
          records: [
            rosterEntry({ athleteId: 1 }),
            rosterEntry({ athleteId: 2, firstNames: 'Juan', lastNames: 'Quintero' }),
            rosterEntry({ athleteId: 3, firstNames: 'Valeria', lastNames: 'Ramírez' }),
            rosterEntry({ athleteId: 4, firstNames: 'Mateo', lastNames: 'Salazar' }),
          ],
        }),
      );

      expect(el().querySelector('.alert')?.textContent).toContain('La lista cambió');
      expect(summary()).toContain('Marcados 3 de 4');
      expect(radio(2, 'ABSENT').checked).toBe(true);
      expect(radio(4, 'PRESENT').checked).toBe(false);
    });
  });
});
